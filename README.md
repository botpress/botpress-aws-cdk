# Botpress deployment to AWS using the AWS CDK

This is an example of deploying Botpress to AWS, using the [AWS CDK](https://github.com/aws/aws-cdk).

This Botpress has the following characteristics:

- Uses **Fargate** as its compute engine
- Deploys a **publicly-accessible** Botpress instance. All backing services (Postgresql database, Redis cache cluster) are private
- Installs the Botpress server, duckling and the Botpress Language Server **in a separate containers**
- Uses **Aurora** Postgresql as its database
- Uses Redis (through [**ElastiCache**](https://aws.amazon.com/elasticache/)) as its cache cluster
- Contains 2 Botpress nodes out-of-the box. Can **scale horizontally** to more nodes
- Uses an **Application Load Balancer** to balance ingress traffic to all Botpress Server nodes
- Uses **AWS WAF** to add additional security in front of the Application Load Balancer

## Installation

### Prerequisites:

- Make sure [`npm`](https://www.npmjs.com/get-npm) is on your `PATH`
- Make sure [`npx`](https://www.npmjs.com/package/npx) is on your `PATH`

### Installing node dependencies

From the project's root, simply run:

```
npm i
```

Now that dependencies are installed, you're ready to deploy to AWS.

## Deploying the stack

Before deploying, make sure to specify your AWS credentials and region. [See here](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_credentials) for more information on how to achieve this using the AWS CDK.

From the project's root:

1. `npx cdk deploy -e Botpress-VPC --profile {your AWS profile}`. More information about AWS profiles can be found [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html)
2. `npx cdk deploy -e Botpress-DB --profile {your AWS profile}`
3. `npx cdk deploy -e Botpress-Redis --profile {your AWS profile}`
4. Connect the database (see "Connecting to the database" below)
5. Create a Postgresql user (`create user {role name} with password '{role password}'`)
6. `grant {role name} to master`
7. Create the database: `create database {db name} with owner {role name}`
8. `npx cdk deploy -e Botpress-Domains --profile {your AWS profile} --parameters DomainName={your top level domain name, e.g. mycompany.com}`. While this stack is being created, you need to update the Name Servers in your domain registrar. First, find the newly created Hosted Zone in Route53. Copy the NS record values, and paste them in your registrar's DNS console. This step is necessary to validate the ACM Certificate.
9. `npx cdk deploy -e Botpress-Services --profile {your AWS profile} --parameters License="your botpress license key" --parameters DatabaseURL="postgres://{role name}:{role password}@{the DNS name for your RDS instance, see RDS console to get it}:3306/{db name}"`
10. `npx cdk deploy -e Botpress-WAF --profile {your AWS profile}`
11. Your Botpress instance will be available at `https://botpress.{your top level domain}`

## Connecting to the database

1. In a terminal, from the `scripts/` directory: `AWS_PROFILE={your AWS profile} AWS_DEFAULT_REGION={your AWS region, e.g. us-east-1} ./connect.sh -o 3000 {the DNS name for your RDS instance, see RDS console to get it} 3306`
2. In another terminal, `psql -h localhost -p 3306 -U master postgres`. The password can be found in AWS Secrets Manager

## Considerations

- Since Fargate does not support Docker Volumes at this time, [disk space limits](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-storage.html) the quantity of languages that can be installed in a single container. A more scalable approach would be to host the language server on an EC2 instance.
