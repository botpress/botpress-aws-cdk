import cdk = require("@aws-cdk/core");
import ec2 = require("@aws-cdk/aws-ec2");
import ecs = require("@aws-cdk/aws-ecs");
import ecsPatterns = require("@aws-cdk/aws-ecs-patterns");
import { ContainerDefinition } from "@aws-cdk/aws-ecs";

export class MyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "VPC");

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      memoryLimitMiB: 512,
      cpu: 256
    });
    const container = taskDefinition.addContainer("MyContainer", {
      image: ecs.ContainerImage.fromRegistry("botpress/server:v12_2_2")
    });
    container.addPortMappings({
      containerPort: 3000
    });

    const loadBalancedFargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "Service",
      {
        cluster,
        // memoryLimitMiB: 1024,
        // cpu: 512,
        taskDefinition
      }
    );

    loadBalancedFargateService.targetGroup.configureHealthCheck({
      path: "/admin/"
    });
  }
}
