import * as cdk from "@aws-cdk/core";
import secretsmanager = require("@aws-cdk/aws-secretsmanager");

export default class CfnParameterSecret extends cdk.Construct {
  public readonly secret: secretsmanager.Secret;
  constructor(scope: cdk.Construct, id: string, parameter: cdk.CfnParameter) {
    super(scope, id);

    this.secret = new secretsmanager.Secret(this, `${id}-Secret`);
    const cfnSecret = this.secret.node.defaultChild as secretsmanager.CfnSecret;
    cfnSecret.generateSecretString = undefined;
    cfnSecret.secretString = parameter.value.toString();
  }
}
