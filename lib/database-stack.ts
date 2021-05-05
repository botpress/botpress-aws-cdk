import * as cdk from "@aws-cdk/core";
import ec2 = require("@aws-cdk/aws-ec2");
import rds = require("@aws-cdk/aws-rds");
import secretsmanager = require("@aws-cdk/aws-secretsmanager");
import iam = require("@aws-cdk/aws-iam");
import kms = require("@aws-cdk/aws-kms");

export interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
}

export class DatabaseStack extends cdk.Stack {
  public readonly clusterEndpoint: rds.Endpoint;
  public readonly password: secretsmanager.Secret;
  public readonly securityGroup: ec2.SecurityGroup;
  public readonly masterUsername = "master";

  constructor(scope: cdk.Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { vpc } = props;

    const dbPassword = new secretsmanager.Secret(this, "MasterPassword", {
      generateSecretString: { excludePunctuation: true, includeSpace: false },
    });
    this.password = dbPassword;

    const securityGroup = new ec2.SecurityGroup(this, "SecurityGroup", { vpc });

    const clusterKey = new kms.Key(this, "ClusterKey", {
      enableKeyRotation: true,
    });

    const cluster = new rds.DatabaseCluster(this, "DbCluster", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_12_4,
      }),
      credentials: {
        username: this.masterUsername,
        password: dbPassword.secretValue,
      },
      instanceProps: {
        vpc,
        instanceType: new ec2.InstanceType("r5.large"),
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
        securityGroups: [securityGroup],
      },
      instances: 1,
      preferredMaintenanceWindow: "Mon:04:45-Mon:05:15",
      defaultDatabaseName: "default_db",
      storageEncryptionKey: clusterKey,
      port: 3306,
      backup: { retention: cdk.Duration.days(14) },
    });

    this.clusterEndpoint = cluster.clusterEndpoint;
    this.securityGroup = securityGroup;

    const bastionRole = new iam.Role(this, "BastionRole", {
      assumedBy: new iam.ServicePrincipal("ec2"),
    });

    // Enables instances to use AWS SSM
    bastionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );

    const bastionSecurityGroup = new ec2.SecurityGroup(
      this,
      "BastionSecurityGroup",
      { vpc }
    );
    securityGroup.connections.allowFrom(
      bastionSecurityGroup,
      ec2.Port.tcp(this.clusterEndpoint.port)
    );

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      "yum -y install ec2-instance-connect unzip",
      'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"',
      "unzip -q awscliv2.zip",
      "./aws/install",
      "rm -dr aws awscliv2.zip",
      "yum remove -y postgresql postgresql-server",
      "yum install -y https://download.postgresql.org/pub/repos/yum/11/redhat/rhel-6-x86_64/postgresql11-libs-11.4-1PGDG.rhel6.x86_64.rpm",
      "yum install -y https://download.postgresql.org/pub/repos/yum/11/redhat/rhel-6-x86_64/postgresql11-11.4-1PGDG.rhel6.x86_64.rpm"
    );

    const bastionInstance = new ec2.Instance(this, "BastionInstance", {
      vpc,
      instanceType: new ec2.InstanceType("t2.micro"),
      machineImage: ec2.MachineImage.latestAmazonLinux({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      securityGroup: bastionSecurityGroup,
      userData,
      role: bastionRole,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    // Tag used by the connect script to SSH into the instance
    cdk.Tags.of(bastionInstance).add("InstanceRole", "bastion", {
      applyToLaunchedInstances: true,
    });
  }
}
