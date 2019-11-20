#!/usr/bin/env node
import "source-map-support/register";
import cdk = require("@aws-cdk/core");
import { BotpressStack } from "../lib/botpressStack";

const app = new cdk.App();
new BotpressStack(app, "BotpressStack");
