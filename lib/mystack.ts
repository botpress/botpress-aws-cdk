import cdk = require("@aws-cdk/core");
import ec2 = require("@aws-cdk/aws-ec2");
import ecs = require("@aws-cdk/aws-ecs");
import ecsPatterns = require("@aws-cdk/aws-ecs-patterns");
import rds = require("@aws-cdk/aws-rds");

export class MyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "VPC");

    const dbName = "botpressdb";
    const dbCluster = new rds.DatabaseCluster(this, "Database", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      engine: rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
      defaultDatabaseName: dbName,
      instances: 1,
      masterUser: {
        username: "clusteradmin"
      },
      instanceProps: {
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.BURSTABLE3,
          ec2.InstanceSize.MEDIUM
        ),
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE
        },
        vpc
      },
      parameterGroup: {
        parameterGroupName: "default.aurora-postgresql10"
      } as any
    });

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      memoryLimitMiB: 3072,
      cpu: 512
    });
    const container = taskDefinition.addContainer("MyContainer", {
      image: ecs.ContainerImage.fromRegistry("botpress/server:v12_2_2"),
      command: [
        "/bin/bash",
        "-c",
        "mkdir -p /botpress/embeddings && time wget -P /botpress/embeddings -q -nc https://nyc3.digitaloceanspaces.com/botpress-public/embeddings/bp.en.100.bin && time wget -P /botpress/embeddings -q -nc https://nyc3.digitaloceanspaces.com/botpress-public/embeddings/bp.en.bpe.model ; ./duckling & ./bp lang --langDir /botpress/embeddings & ./bp"
      ],
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "spgtest" })
    });
    container.addPortMappings({
      containerPort: 3000
    });

    const loadBalancedFargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "Service",
      {
        cluster,
        taskDefinition,
        healthCheckGracePeriod: cdk.Duration.seconds(600)
      }
    );

    dbCluster.connections.allowFrom(
      loadBalancedFargateService.service,
      ec2.Port.allTraffic()
    );

    loadBalancedFargateService.targetGroup.configureHealthCheck({
      path: "/admin/"
    });
  }
}
