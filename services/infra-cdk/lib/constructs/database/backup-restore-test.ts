import { ArnFormat, CfnOutput, Duration, Stack } from 'aws-cdk-lib'
import {
    Peer,
    Port,
    SecurityGroup,
    SubnetType,
    type ISecurityGroup,
    type IVpc,
} from 'aws-cdk-lib/aws-ec2'
import {
    Effect,
    ManagedPolicy,
    PolicyStatement,
    Role,
    WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'
import { join } from 'node:path'
import {
    BACKUP_TEST_PURPOSE,
    backupRestoreConfig,
} from '../../../../../scripts/backup-restore-config'

interface Props {
    stage: string
    vpc: IVpc
    secretsEndpointGroup: ISecurityGroup
    databaseSecret: ISecret
    sourceRetentionDays: number
}

/** Adds only test resources/permissions. Never changes the source DB or backups. */
export class BackupRestoreTest extends Construct {
    constructor(scope: Construct, id: string, props: Props) {
        super(scope, id)
        const stack = Stack.of(this)
        const config = backupRestoreConfig(props.stage, stack.account)
        const arn = (resource: string, name: string) =>
            stack.formatArn({
                service: 'rds',
                resource,
                resourceName: name,
                arnFormat: ArnFormat.COLON_RESOURCE_NAME,
            })
        const clusterArn = arn('cluster', `${config.clusterPrefix}*`)
        const instanceArn = arn('db', `${config.clusterPrefix}*`)
        const restoreGroup = new SecurityGroup(this, 'RestoredDatabase', {
            vpc: props.vpc,
            allowAllOutbound: false,
        })
        const validatorGroup = new SecurityGroup(this, 'ValidatorNetwork', {
            vpc: props.vpc,
            allowAllOutbound: false,
        })
        restoreGroup.addIngressRule(
            validatorGroup,
            Port.tcp(5432),
            'Only backup validator may query restored data'
        )
        validatorGroup.addEgressRule(restoreGroup, Port.tcp(5432))
        // Access Secrets Manager's existing VPC endpoint and download the RDS CA.
        // No 5432 ingress to the source application/database group is added.
        props.secretsEndpointGroup.addIngressRule(
            validatorGroup,
            Port.tcp(443),
            'Backup validator to Secrets Manager'
        )
        validatorGroup.addEgressRule(Peer.anyIpv4(), Port.tcp(443))
        const validator = new NodejsFunction(this, 'Validator', {
            functionName: `postgres-${props.stage}-backupRestoreValidator-cdk`,
            entry: join(
                __dirname,
                '../../../../postgres/src/backupRestoreValidator.ts'
            ),
            handler: 'handler',
            runtime: Runtime.NODEJS_24_X,
            timeout: Duration.seconds(60),
            memorySize: 256,
            vpc: props.vpc,
            vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [validatorGroup],
            environment: {
                DB_SECRET_ARN: props.databaseSecret.secretArn,
                EXPECTED_ACCOUNT_ID: stack.account,
                RESTORE_CLUSTER_PREFIX: config.clusterPrefix,
                SOURCE_CLUSTER_IDENTIFIER: config.sourceIdentifier,
                EXPECTED_DATABASE: config.expectedDatabase,
            },
            bundling: { externalModules: [] },
            logGroup: new LogGroup(this, 'ValidatorLogs', {
                retention: RetentionDays.ONE_WEEK,
            }),
        })
        props.databaseSecret.grantRead(validator)

        const runner = new Role(this, 'RunnerRole', {
            roleName: config.roleName,
            path: '/delegatedadmin/developer/',
            maxSessionDuration: Duration.hours(1),
            assumedBy: new WebIdentityPrincipal(
                `arn:aws:iam::${stack.account}:oidc-provider/token.actions.githubusercontent.com`,
                {
                    StringEquals: {
                        'token.actions.githubusercontent.com:aud':
                            'sts.amazonaws.com',
                        'token.actions.githubusercontent.com:sub': `repo:Enterprise-CMCS/managed-care-review:environment:${config.sourceStage}`,
                    },
                }
            ),
            permissionsBoundary: ManagedPolicy.fromManagedPolicyArn(
                this,
                'CmsBoundary',
                `arn:aws:iam::${stack.account}:policy/cms-cloud-admin/ct-ado-poweruser-permissions-boundary-policy`
            ),
        })
        runner.addToPolicy(
            new PolicyStatement({
                actions: ['cloudformation:DescribeStacks'],
                resources: [stack.stackId],
            })
        )
        runner.addToPolicy(
            new PolicyStatement({
                actions: ['rds:DescribeDBClusters', 'rds:DescribeDBInstances'],
                resources: ['*'],
            })
        )
        runner.addToPolicy(
            new PolicyStatement({
                actions: ['rds:ListTagsForResource', 'rds:AddTagsToResource'],
                resources: [clusterArn, instanceArn],
            })
        )
        runner.addToPolicy(
            new PolicyStatement({
                actions: ['rds:RestoreDBClusterToPointInTime'],
                resources: [
                    config.sourceArn,
                    clusterArn,
                    arn('cluster-pg', '*'),
                    arn('subgrp', '*'),
                    arn('og', 'default:*'),
                ],
                conditions: {
                    StringEquals: {
                        'aws:RequestTag/Purpose': BACKUP_TEST_PURPOSE,
                        'aws:RequestTag/RestoreTestOwner': props.stage,
                    },
                },
            })
        )
        runner.addToPolicy(
            new PolicyStatement({
                actions: ['rds:CreateDBInstance'],
                resources: [
                    clusterArn,
                    instanceArn,
                    arn('pg', 'default.aurora-postgresql*'),
                    arn('subgrp', '*'),
                    arn('og', 'default:*'),
                ],
                conditions: {
                    Bool: { 'rds:PubliclyAccessible': false },
                    StringEquals: {
                        'aws:RequestTag/Purpose': BACKUP_TEST_PURPOSE,
                        'aws:RequestTag/RestoreTestOwner': props.stage,
                    },
                },
            })
        )
        runner.addToPolicy(
            new PolicyStatement({
                actions: ['rds:DeleteDBCluster', 'rds:DeleteDBInstance'],
                resources: [clusterArn, instanceArn],
                conditions: {
                    StringEquals: {
                        'aws:ResourceTag/Purpose': BACKUP_TEST_PURPOSE,
                        'aws:ResourceTag/RestoreTestOwner': props.stage,
                    },
                },
            })
        )
        // Even an accidental future allow cannot authorize deletion outside tests.
        runner.addToPolicy(
            new PolicyStatement({
                effect: Effect.DENY,
                actions: ['rds:DeleteDBCluster', 'rds:DeleteDBInstance'],
                notResources: [clusterArn, instanceArn],
            })
        )
        runner.addToPolicy(
            new PolicyStatement({
                effect: Effect.DENY,
                actions: [
                    'rds:ModifyDBCluster',
                    'rds:ModifyDBInstance',
                    'rds:DeleteDBClusterSnapshot',
                    'rds:DeleteDBSnapshot',
                    'rds:DeleteDBClusterAutomatedBackup',
                    'kms:DisableKey',
                    'kms:ScheduleKeyDeletion',
                ],
                resources: ['*'],
            })
        )
        runner.addToPolicy(
            new PolicyStatement({
                actions: [
                    'kms:Decrypt',
                    'kms:DescribeKey',
                    'kms:GenerateDataKey',
                ],
                resources: ['*'],
                conditions: {
                    StringEquals: {
                        'kms:ViaService': `rds.${config.region}.amazonaws.com`,
                    },
                },
            })
        )
        runner.addToPolicy(
            new PolicyStatement({
                actions: ['kms:CreateGrant'],
                resources: ['*'],
                conditions: { Bool: { 'kms:GrantIsForAWSResource': true } },
            })
        )
        validator.grantInvoke(runner)
        if (props.stage === 'prod') {
            // Created/updated only after successful validation AND cleanup, not
            // managed as a CFN value that redeployments might reset to "never".
            runner.addToPolicy(
                new PolicyStatement({
                    actions: ['ssm:GetParameter', 'ssm:PutParameter'],
                    resources: [
                        stack.formatArn({
                            service: 'ssm',
                            resource: 'parameter',
                            resourceName: config.parameterName.slice(1),
                            arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
                        }),
                    ],
                })
            )
        }
        new CfnOutput(stack, 'BackupRestoreRoleArn', { value: runner.roleArn })
        new CfnOutput(stack, 'BackupRestoreValidatorFunctionName', {
            value: validator.functionName,
        })
        new CfnOutput(stack, 'BackupRestoreSecurityGroupId', {
            value: restoreGroup.securityGroupId,
        })
        new CfnOutput(stack, 'BackupRestoreExpectedRetentionDays', {
            value: String(props.sourceRetentionDays),
        })
    }
}
