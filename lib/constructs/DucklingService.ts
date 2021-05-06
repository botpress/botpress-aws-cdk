import * as cdk from "@aws-cdk/core";
import ecs = require("@aws-cdk/aws-ecs");
import logs = require("@aws-cdk/aws-logs");
import ec2 = require("@aws-cdk/aws-ec2");
import cloudmap = require("@aws-cdk/aws-servicediscovery");
import path = require("path");

export interface DucklingServiceProps {
  projectName: String;
  vpc: ec2.IVpc;
  cluster: ecs.Cluster;
  dnsNamespace: cloudmap.INamespace;
}

export default class DucklingService extends cdk.Construct {
  public readonly securityGroup: ec2.ISecurityGroup;
  public readonly port = 8000;

  constructor(scope: cdk.Construct, id: string, props: DucklingServiceProps) {
    super(scope, id);

    const { projectName, vpc, cluster, dnsNamespace } = props;

    const image = ecs.ContainerImage.fromAsset(
      path.join(__dirname, "..", "docker-image")
    );

    const subdomain = "duckling";

    const ducklingTaskDef = new ecs.FargateTaskDefinition(this, "TaskDef", {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    const container = ducklingTaskDef.addContainer("duckling", {
      image: image,
      entryPoint: ["/bin/sh", "-c"],
      command: [`./duckling -p ${this.port}`],
      logging: ecs.LogDrivers.awsLogs({
        logRetention: logs.RetentionDays.ONE_MONTH,
        streamPrefix: `${projectName}-prod-duckling`,
      }),
    });
    container.addPortMappings({ containerPort: this.port });

    const securityGroup = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc,
    });
    this.securityGroup = securityGroup;

    new ecs.FargateService(this, "Service", {
      cluster,
      taskDefinition: ducklingTaskDef,
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
