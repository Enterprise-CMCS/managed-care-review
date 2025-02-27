
service: app-api
frameworkVersion: 4.2.3
package:
  individually: true
  patterns:
    - '!node_modules/prisma'
    - '!node_modules/.prisma'
    - '!node_modules/@prisma'
  artifactsS3KeyDirname: serverless/app-api/mtcleanupv4/code-artifacts
plugins:
  - serverless-esbuild
  - serverless-stack-termination-protection
  - serverless-s3-bucket-helper
  - serverless-iam-helper
  - serverless-offline
build:
  esbuild: false
custom:
  applicationEndpoint: http://localhost:3000
  appApiGatewayId: this-value-does-not-matter
  appApiGatewayRootResourceId: this-value-does-not-matter
  appApiWafAclArn: this-value-does-not-matter
  emailerMode: LOCAL
  parameterStoreMode: LOCAL
  auroraV2Arn: this-value-does-not-matter
  document_uploads_bucket_arn: this-value-does-not-matter
  qa_uploads_bucket_arn: this-value-does-not-matter
  secretsManagerSecret: aurora_postgres_mtcleanupv4
  reactAppAuthMode: LOCAL
  apiAppOtelCollectorUrl: http://localhost:4318/v1/traces
  dbURL: >-
    postgresql://postgres:shhhsecret@localhost:5432/postgres?schema=public&connection_limit=5
  ldSDKKey: sdk-9f6315a3-ad22-4af8-9e21-b5caf2e12b98
  jwtSecretJSON: this-value-does-not-matter
  jwtSecret: >-
    3fd2e448ed2cec1fa46520f1b64bcb243c784f68db41ea67ef9abc45c12951d3e770162829103c439f01d2b860d06ed0da1a08895117b1ef338f1e4ed176448a
  reactAppS3DocumentUploadsBucket: local-uploads
  reactAppS3QABucket: local-qa
  esbuild:
    config: ./esbuild.config.js
  serverlessTerminationProtection:
    stages:
      - dev
      - val
      - prod
      - main
  vpcId: local
  sgId: local
  privateSubnets:
    - local
    - local
    - local
  iamPermissionsBoundary: arn:aws:iam::local:policy/local/developer-boundary-policy
  iamPath: /
  lambdaMemory:
    prod: 4096
    default: 1024
provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  stage: mtcleanupv4
  apiGateway:
    restApiId: this-value-does-not-matter
    restApiRootResourceId: this-value-does-not-matter
  layers:
    - >-
      arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4
  iam:
    role:
      path: /
      permissionsBoundary: arn:aws:iam::local:policy/local/developer-boundary-policy
      statements:
        - Effect: Allow
          Action:
            - cognito-idp:ListUsers
          Resource: '*'
        - Effect: Allow
          Action:
            - secretsmanager:GetSecretValue
            - secretsmanager:DescribeSecret
          Resource: '*'
        - Effect: Allow
          Action:
            - rds-db:connect
          Resource: this-value-does-not-matter
        - Effect: Allow
          Action:
            - ses:SendEmail
            - ses:SendRawEmail
          Resource: '*'
        - Effect: Allow
          Action:
            - lambda:InvokeFunction
          Resource: '*'
        - Effect: Allow
          Action:
            - s3:*
          Resource:
            - this-value-does-not-matter/allusers/*
            - this-value-does-not-matter/allusers/*
        - Effect: Allow
          Action:
            - ssm:GetParameter
            - ssm:GetParameters
          Resource: '*'
        - Effect: Allow
          Action:
            - rds:CreateDBClusterSnapshot
            - rds:CreateDBSnapshot
            - rds:CopyDBClusterSnapshot
            - rds:CopyDBSnapshot
            - rds:DescribeDBClusterSnapshots
            - rds:DeleteDBClusterSnapshot
          Resource: '*'
  environment:
    stage: mtcleanupv4
    REGION: us-east-1
    DATABASE_URL: >-
      postgresql://postgres:shhhsecret@localhost:5432/postgres?schema=public&connection_limit=5
    VITE_APP_AUTH_MODE: LOCAL
    API_APP_OTEL_COLLECTOR_URL: http://localhost:4318/v1/traces
    SECRETS_MANAGER_SECRET: aurora_postgres_mtcleanupv4
    EMAILER_MODE: LOCAL
    PARAMETER_STORE_MODE: LOCAL
    APPLICATION_ENDPOINT: http://localhost:3000
    AWS_LAMBDA_EXEC_WRAPPER: /opt/otel-handler
    OPENTELEMETRY_COLLECTOR_CONFIG_FILE: /var/task/collector.yml
    LD_SDK_KEY: sdk-9f6315a3-ad22-4af8-9e21-b5caf2e12b98
    JWT_SECRET: >-
      3fd2e448ed2cec1fa46520f1b64bcb243c784f68db41ea67ef9abc45c12951d3e770162829103c439f01d2b860d06ed0da1a08895117b1ef338f1e4ed176448a
    VITE_APP_S3_QA_BUCKET: local-qa
    VITE_APP_S3_DOCUMENTS_BUCKET: local-uploads
  versionFunctions: true
layers:
  prismaClientMigration:
    path: lambda-layers-prisma-client-migration
  prismaClientEngine:
    path: lambda-layers-prisma-client-engine
functions:
  email_submit:
    handler: src/handlers/email_submit.main
    events: []
    name: app-api-mtcleanupv4-email_submit
  health:
    handler: src/handlers/health_check.main
    events:
      - http:
          path: health_check
          method: get
          cors: true
    name: app-api-mtcleanupv4-health
  third_party_api_authorizer:
    handler: src/handlers/third_party_API_authorizer.main
    events: []
    name: app-api-mtcleanupv4-third_party_api_authorizer
  otel:
    handler: src/handlers/otel_proxy.main
    events:
      - http:
          path: otel
          method: post
          cors: true
    name: app-api-mtcleanupv4-otel
  graphql:
    handler: src/handlers/apollo_gql.gqlHandler
    events:
      - http:
          path: graphql
          method: post
          cors: true
          authorizer: aws_iam
      - http:
          path: graphql
          method: get
          cors: true
          authorizer: aws_iam
      - http:
          path: v1/graphql/external
          method: post
          cors: true
          authorizer:
            name: third_party_api_authorizer
            identitySource: method.request.header.Authorization
      - http:
          path: v1/graphql/external
          method: get
          cors: true
          authorizer:
            name: third_party_api_authorizer
            identitySource: method.request.header.Authorization
    timeout: 30
    vpc:
      securityGroupIds:
        - local
      subnetIds:
        - local
        - local
        - local
    layers:
      - Ref: PrismaClientEngineLambdaLayer
      - >-
        arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4
    name: app-api-mtcleanupv4-graphql
  migrate:
    handler: src/handlers/postgres_migrate.main
    timeout: 60
    vpc:
      securityGroupIds:
        - local
      subnetIds:
        - local
        - local
        - local
    layers:
      - Ref: PrismaClientMigrationLambdaLayer
      - >-
        arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4
    events: []
    name: app-api-mtcleanupv4-migrate
  zip_keys:
    handler: src/handlers/bulk_download.main
    events:
      - http:
          path: zip
          method: post
          cors: true
          authorizer: aws_iam
    timeout: 60
    memorySize: 1024
    name: app-api-mtcleanupv4-zip_keys
  cleanup:
    handler: src/handlers/cleanup.main
    events:
      - schedule: cron(0 14 ? * MON-FRI *)
    layers:
      - >-
        arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4
    name: app-api-mtcleanupv4-cleanup
  auditFiles:
    handler: src/handlers/audit_s3.main
    timeout: 60
    vpc:
      securityGroupIds:
        - local
      subnetIds:
        - local
        - local
        - local
    layers:
      - Ref: PrismaClientEngineLambdaLayer
      - >-
        arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4
    events: []
    name: app-api-mtcleanupv4-auditFiles
resources:
  Resources:
    ApiGwWebAclAssociation:
      Type: AWS::WAFv2::WebACLAssociation
      DependsOn:
        - ApiGatewayDeployment1739997580380
      Properties:
        ResourceArn: >-
          arn:aws:apigateway:us-east-1::/restapis/this-value-does-not-matter/stages/mtcleanupv4
        WebACLArn: this-value-does-not-matter
  Outputs:
    ApiAuthMode:
      Value: LOCAL
    Region:
      Value:
        Fn::Sub: ${AWS::Region}
