import * as cdk from "@aws-cdk/core";
import ecs = require("@aws-cdk/aws-ecs");
import logs = require("@aws-cdk/aws-logs");
import ec2 = require("@aws-cdk/aws-ec2");
import cloudmap = require("@aws-cdk/aws-servicediscovery");
import path = require("path");

export interface LangServerServiceProps {
  projectName: String;
  vpc: ec2.IVpc;
  cluster: ecs.Cluster;
  dnsNamespace: cloudmap.INamespace;
  domainName: string;
}

export default class LangServerService extends cdk.Construct {
  public readonly securityGroup: ec2.ISecurityGroup;
  public readonly port = 3100;

  constructor(scope: cdk.Construct, id: string, props: LangServerServiceProps) {
    super(scope, id);

    const { projectName, vpc, cluster, dnsNamespace, domainName } = props;

    const subdomain = "lang";

    const image = ecs.ContainerImage.fromAsset(
      path.join(__dirname, "..", "docker-image")
    );

    const taskDef = new ecs.FargateTaskDefinition(this, "TaskDef", {
      memoryLimitMiB: 4096,
      cpu: 512,
    });

    taskDef.addContainer("lang", {
      image: image,
      entryPoint: ["/bin/sh", "-c"],
      command: [
        `./bp lang --langDir /botpress/lang --port ${this.port} --offline --dim 300`,
      ],
      environment: {
        BP_PRODUCTION: "true",
        BP_MODULES_PATH: "/botpress/modules:/botpress/additional-modules",
        BP_DECISION_MIN_NO_REPEAT: "1ms",
        BPFS_STORAGE: "database",
        CLUSTER_ENABLED: "true",
        PRO_ENABLED: "true",
        EXPOSED_LICENSE_SERVER: "https://license.botpress.io/",
        VERBOSITY_LEVEL: "3",
        AUTO_MIGRATE: "true",
        DATABASE_POOL: '{"min": 2, "max": 5}',
        EXTERNAL_URL: `https://${domainName}`,
      },
      logging: ecs.LogDrivers.awsLogs({
        logRetention: logs.RetentionDays.ONE_MONTH,
        streamPrefix: `${projectName}-lang`,
      }),
    });

    const securityGroup = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc,
    });
    this.securityGroup = securityGroup;

    new ecs.FargateService(this, "Service", {
      cluster,
      taskDefinition: taskDef,
      assignPublicIp: false,
      securityGroup: securityGroup,
      enableECSManagedTags: true,
      propagateTags: ecs.PropagatedTagSource.SERVICE,
      desiredCount: 1,
      cloudMapOptions: {
        cloudMapNamespace: dnsNamespace,
        name: subdomain,
      },
    });
  }

  public allowIngress(securityGroup: ec2.ISecurityGroup) {
    this.securityGroup.addIngressRule(securityGroup, ec2.Port.tcp(this.port));
  }
}
