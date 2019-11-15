import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import cdk = require('@aws-cdk/core');
import Tempdir = require('../lib/mystack');

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Tempdir.TempdirStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
