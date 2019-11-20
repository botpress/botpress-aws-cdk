#!/usr/bin/env node
import "source-map-support/register";
import cdk = require("@aws-cdk/core");
import { MyStack } from "../lib/mystack";

const app = new cdk.App();
new MyStack(app, "MyStack2");
