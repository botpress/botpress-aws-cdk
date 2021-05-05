#!/usr/bin/env node
import "source-map-support/register";
import cdk = require("@aws-cdk/core");
import { VpcStack } from "../lib/vpc-stack";
import { DatabaseStack } from "../lib/database-stack";
import { Tags } from "@aws-cdk/core";
import { RedisStack } from "../lib/redis-stack";

const app = new cdk.App();

// Useful for cost reporting
Tags.of(app).add("CostCenter", "botpress");

const prefix = "Botpress";

const { vpc } = new VpcStack(app, `${prefix}-VPC`);
new DatabaseStack(app, `${prefix}-DB`, { vpc });
new RedisStack(app, `${prefix}-Redis`, { vpc });
