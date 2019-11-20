import cdk = require("@aws-cdk/core");
import ec2 = require("@aws-cdk/aws-ec2");
import ecs = require("@aws-cdk/aws-ecs");
import ecsPatterns = require("@aws-cdk/aws-ecs-patterns");
import rds = require("@aws-cdk/aws-rds");
import secretsmanager = require("@aws-cdk/aws-secretsmanager");
import logs = require("@aws-cdk/aws-logs");
import elasticache = require("@aws-cdk/aws-elasticache");

export class MyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "VPC");

    const dbSecret = new secretsmanager.Secret(this, "DbSecret", {
      generateSecretString: {
        passwordLength: 30,
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: "password",
        excludeCharacters: '"@/\\',
        excludePunctuation: true
      }
    });

    const dbName = "botpressdb";
    const dbUsername = "clusteradmin";

    const dbCluster = new rds.DatabaseCluster(this, "Database", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      engine: rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
      defaultDatabaseName: dbName,
      instances: 1,
      masterUser: {
        username: dbUsername,
        password: dbSecret.secretValueFromJson("password")
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

    const redisSecurityGroup = new ec2.SecurityGroup(
      this,
      "RedisSecurityGroup",
      {
        vpc
      }
    );
    const cacheSubnetGroup = new elasticache.CfnSubnetGroup(
      this,
      "CacheSubnetGroup",
      {
        description: "",
        subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId)
      }
    );
    const cacheCluster = new elasticache.CfnCacheCluster(this, "RedisCluster", {
      cacheNodeType: "cache.m5.large",
      engine: "redis",
      numCacheNodes: 1,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: cacheSubnetGroup.ref
    });

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      memoryLimitMiB: 3072,
      cpu: 512
    });
    const container = taskDefinition.addContainer("MyContainer", {
      image: ecs.ContainerImage.fromRegistry("botpress/server:v12_2_3"),
      command: [
        "/bin/bash",
        "-c",
        'echo "starting container" && mkdir -p /botpress/embeddings && time wget -P /botpress/embeddings -q -nc https://nyc3.digitaloceanspaces.com/botpress-public/embeddings/bp.en.100.bin && time wget -P /botpress/embeddings -q -nc https://nyc3.digitaloceanspaces.com/botpress-public/embeddings/bp.en.bpe.model ; ./duckling & ./bp lang --langDir /botpress/embeddings & ./bp'
      ],
      environment: {
        DATABASE_URL: `postgres://${dbUsername}:${dbSecret
          .secretValueFromJson("password")
          .toString()}@${dbCluster.clusterEndpoint.socketAddress}/${dbName}`,
        BPFS_STORAGE: "database",
        REDIS_URL: `redis://${cacheCluster.attrRedisEndpointAddress}:${cacheCluster.attrRedisEndpointPort}`,
        PRO_ENABLED: "true",
        CLUSTER_ENABLED: "true",
        AUTO_MIGRATE: "true",
        BP_MODULE_NLU_LANGUAGESOURCES: '[{"endpoint":"http://localhost:3100"}]'
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "spgtest",
        logRetention: logs.RetentionDays.ONE_WEEK
      })
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
        healthCheckGracePeriod: cdk.Duration.minutes(7),
        desiredCount: 2
      }
    );

    dbCluster.connections.allowFrom(
      loadBalancedFargateService.service,
      ec2.Port.allTraffic()
    );

    redisSecurityGroup.connections.allowFrom(
      loadBalancedFargateService.service,
      ec2.Port.allTraffic()
    );

    loadBalancedFargateService.targetGroup.configureHealthCheck({
      path: "/admin/"
    });
  }
}
