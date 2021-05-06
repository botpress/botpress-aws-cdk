#!/usr/bin/env node
import "source-map-support/register";
import cdk = require("@aws-cdk/core");
import { VpcStack } from "../lib/vpc-stack";
import { DatabaseStack } from "../lib/database-stack";
import { Tags } from "@aws-cdk/core";
import { RedisStack } from "../lib/redis-stack";
import { ServicesStack } from "../lib/services-stack";
import { DomainsStack } from "../lib/domains-stack";
import { WAFStack } from "../lib/waf-stack";

const app = new cdk.App();

Tags.of(app).add("CostCenter", "botpress"); // Useful for cost reporting

const prefix = "Botpress";

const { vpc } = new VpcStack(app, `${prefix}-VPC`);

const {
  clusterEndpoint: dbClusterEndpoint,
  securityGroup: dbClusterSecurityGroup,
} = new DatabaseStack(app, `${prefix}-DB`, { vpc });

const {
  primaryEndpoint: redisEndpoint,
  securityGroup: redisSecurityGroup,
} = new RedisStack(app, `${prefix}-Redis`, { vpc });

const { hostedZone, certificate } = new DomainsStack(app, `${prefix}-Domains`);

const { loadBalancer } = new ServicesStack(app, `${prefix}-Services`, {
  vpc,
  hostedZone,
  certificate,
  dbClusterEndpoint,
  redisPort: redisEndpoint.port,
  redisEndpoint,
  redisSecurityGroup,
  dbClusterSecurityGroup,
  dbClusterPort: dbClusterEndpoint.port,
});

new WAFStack(app, `${prefix}-WAF`, { loadBalancer });
