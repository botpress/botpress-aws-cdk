import * as cdk from "@aws-cdk/core";
import ec2 = require("@aws-cdk/aws-ec2");

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "Vpc", { maxAzs: 2 });
    this.vpc = vpc;
  }
}
