# Botpress deployment to AWS using the AWS CDK

This is an example of deploying Botpress to AWS, using the [AWS CDK](https://github.com/aws/aws-cdk).

This Botpress has the following characteristics:

- Uses **Fargate** as its compute engine
- Deploys a **publicly-accessible** Botpress instance. All backing services (Postgresql database, Redis cache cluster) are private
- Installs the Botpress server, duckling and the Botpress Language Server **in a single container**
- Uses **Aurora** Postgresql as its database
- Uses Redis (through [**ElastiCache**](https://aws.amazon.com/elasticache/)) as its cache cluster
- Contains 2 Botpress nodes out-of-the box. Can **scale horizontally** to more nodes
- Uses an **Application Load Balancer** to balance ingress traffic to all Botpress Server nodes

## Installation

### Prerequisites:

- Make sure [`npx`](https://www.npmjs.com/package/npx) is on your `PATH`
- Make sure [`npm`](https://www.npmjs.com/get-npm) is on your `PATH`

### Installing node dependencies

From the project's root, simply run:

```
npm i
```

Now that dependencies are installed, you're ready to deploy to AWS.

## Deploying the stack

Before deploying, make sure to specify your AWS credentials and region. [See here](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_credentials) for more information on how to achieve this using the AWS CDK.

From the project's root, run:

```
DOMAIN_NAME={your domain name} BP_LICENSE_KEY={your Botpress license key} npx cdk deploy
```

e.g.

```
DOMAIN_NAME=mybotpresscluster.com BP_LICENSE_KEY=abcd1234 npx cdk deploy
```

More information about AWS profiles can be found [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html)

## Considerations

- Since Fargate does not support Docker Volumes at this time, [disk space limits](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-storage.html) the quantity of languages that can be installed in a single container. A more scalable approach would be to host the language server on an EC2 instance.
