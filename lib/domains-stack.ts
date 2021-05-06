import * as cdk from "@aws-cdk/core";
import acm = require("@aws-cdk/aws-certificatemanager");
import route53 = require("@aws-cdk/aws-route53");

export class DomainsStack extends cdk.Stack {
  public readonly hostedZone: route53.IHostedZone;
  public readonly certificate: acm.Certificate;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainNameParam = new cdk.CfnParameter(this, "DomainName", {
      type: "String",
      noEcho: true,
    });
    const domainName = domainNameParam.value.toString();

    const hostedZone = new route53.HostedZone(this, "HostedZone", {
      zoneName: domainName,
    });
    this.hostedZone = hostedZone;

    this.certificate = new acm.DnsValidatedCertificate(this, "Certificate", {
      hostedZone,
      domainName,
      subjectAlternativeNames: [`*.${domainName}`],
      validationMethod: acm.ValidationMethod.DNS,
    });
  }
}
