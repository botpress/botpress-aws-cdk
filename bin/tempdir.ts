#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { TempdirStack } from '../lib/tempdir-stack';

const app = new cdk.App();
new TempdirStack(app, 'TempdirStack');
