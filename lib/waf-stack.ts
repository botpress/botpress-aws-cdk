import * as cdk from "@aws-cdk/core";
import elbv2 = require("@aws-cdk/aws-elasticloadbalancingv2");
import waf = require("@aws-cdk/aws-wafv2");
import firehose = require("@aws-cdk/aws-kinesisfirehose");
import s3 = require("@aws-cdk/aws-s3");
import iam = require("@aws-cdk/aws-iam");

export interface WAFStackProps extends cdk.StackProps {
  loadBalancer: elbv2.IApplicationLoadBalancer;
}

export class WAFStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: WAFStackProps) {
    super(scope, id, props);

    const { loadBalancer } = props;

    const wafLoggingBucket = new s3.Bucket(this, "WAFLoggingBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const deliveryStreamRole = new iam.Role(this, "DeliveryStreamRole", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
    });

    wafLoggingBucket.grantReadWrite(deliveryStreamRole);

    new firehose.CfnDeliveryStream(this, "LoggingDeliveryStream", {
      deliveryStreamName: "aws-waf-logs",
      extendedS3DestinationConfiguration: {
        bucketArn: wafLoggingBucket.bucketArn,
        bufferingHints: { intervalInSeconds: 900, sizeInMBs: 1 },
        compressionFormat: "GZIP",
        roleArn: deliveryStreamRole.roleArn,
      },
    });

    // Based on this example: https://docs.aws.amazon.com/waf/latest/developerguide/waf-using-managed-rule-groups.html
    const acl = new waf.CfnWebACL(this, "WebAcl", {
      defaultAction: { allow: {} },
      scope: "REGIONAL",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "MyMetric",
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: "AWS-AWSManagedRulesCommonRuleSet",
          priority: 0,
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "MetricForAMRCRS",
          },
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet",
              excludedRules: [
                // Blocks file saves in the Botpress Code Editor
                { name: "EC2MetaDataSSRF_BODY" },
                { name: "NoUserAgent_HEADER" },
                { name: "SizeRestrictions_BODY" },
                { name: "GenericLFI_BODY" },
                { name: "GenericRFI_BODY" },
                // Blocks CSS statements
                { name: "CrossSiteScripting_BODY" },
                // Blocks the webchat via "Open Chat"
                { name: "GenericRFI_QUERYARGUMENTS" },
              ],
            },
          },
        },
        {
          name: "AWS-AWSManagedRulesSQLiRuleSet",
          priority: 1,
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "MetricForAMRSQLRS",
          },
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesSQLiRuleSet",
            },
          },
        },
      ],
    });
    new waf.CfnWebACLAssociation(this, "AclAssociation", {
      webAclArn: acl.attrArn,
      resourceArn: loadBalancer.loadBalancerArn,
    });
  }
}
