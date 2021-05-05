#!/usr/bin/env node
import "source-map-support/register";
import cdk = require("@aws-cdk/core");
import { BotpressStack } from "../lib/botpressStack";
import { VpcStack } from "../lib/vpc-stack";

const app = new cdk.App();
// new BotpressStack(app, "BotpressStack");
new VpcStack(app, "VPC");
