import assert from 'node:assert/strict'
import { test } from 'node:test'
import { App, Stack } from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BackupRestoreTest } from '../lib/constructs/database/backup-restore-test'
import { backupRestoreConfig } from '../../../scripts/backup-restore-config'

const sourceGroupId = 'sg-0123456789abcdef0'
function template(stage: string, bundle = false) {
    const app = new App({
        context: bundle ? {} : { 'aws:cdk:bundling-stacks': [] },
    })
    const stack = new Stack(app, 'Test', {
        env: { account: '123456789012', region: 'us-east-1' },
    })
    const vpc = Vpc.fromVpcAttributes(stack, 'Vpc', {
        vpcId: 'vpc-0123456789abcdef0',
        availabilityZones: ['us-east-1a', 'us-east-1b'],
        privateSubnetIds: [
            'subnet-0123456789abcdef0',
            'subnet-0123456789abcdef1',
        ],
    })
    new BackupRestoreTest(stack, 'BackupTest', {
        stage,
        vpc,
        sourceRetentionDays: stage === 'prod' ? 30 : 1,
        secretsEndpointGroup: SecurityGroup.fromSecurityGroupId(
            stack,
            'SourceGroup',
            sourceGroupId
        ),
        databaseSecret: Secret.fromSecretCompleteArn(
            stack,
            'Secret',
            'arn:aws:secretsmanager:us-east-1:123456789012:secret:database-Ab1234'
        ), // pragma: allowlist secret
    })
    return Template.fromStack(stack)
}
void test('test infrastructure contains no RDS resources, AWS Backup plan, or source backup changes', () => {
    const t = template('prod')
    t.resourceCountIs('AWS::RDS::DBCluster', 0)
    t.resourceCountIs('AWS::RDS::DBInstance', 0)
    t.resourceCountIs('AWS::Backup::BackupPlan', 0)
    t.resourceCountIs('AWS::Lambda::Function', 1)
    t.resourceCountIs('AWS::SSM::Parameter', 0)
    t.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 60,
        Environment: {
            Variables: {
                EXPECTED_DATABASE: 'aurora_postgres_prod_123456789012_cdk',
                SOURCE_CLUSTER_IDENTIFIER: 'postgres-prod-cluster-cdk',
            },
        },
    })
    const raw = JSON.stringify(t.toJSON())
    assert.equal(raw.includes('ssm:DeleteParameter'), false)
    assert.equal(raw.includes('rds:*'), false)
})
void test('validator Lambda actually bundles offline, not only a mocked asset', () => {
    template('prod', true).resourceCountIs('AWS::Lambda::Function', 1)
})
void test('two-character and hyphenated review deployments remain valid', () => {
    for (const stage of ['ab', 'feature-x'])
        template(stage).resourceCountIs('AWS::Lambda::Function', 1)
})
void test('runner has its own OIDC role, no deployment/secret-reading privileges, and non-test deletes are explicitly denied', () => {
    const t = template('prod')
    const roleEntries = Object.entries(
        t.findResources('AWS::IAM::Role')
    ).filter(
        ([, role]) =>
            role.Properties.RoleName === 'postgres-prod-backupRestoreTest-cdk'
    )
    assert.equal(roleEntries.length, 1)
    const [id, role] = roleEntries[0]
    const trust = JSON.stringify(role.Properties.AssumeRolePolicyDocument)
    assert.match(trust, /environment:prod/)
    assert.match(trust, /sts\.amazonaws\.com/)
    const policies = Object.values(t.findResources('AWS::IAM::Policy')).filter(
        (policy) => JSON.stringify(policy.Properties.Roles).includes(id)
    )
    const statements = policies.flatMap(
        (policy) => policy.Properties.PolicyDocument.Statement
    )
    const allowed = statements.filter(
        (statement) => statement.Effect === 'Allow'
    )
    assert.equal(
        JSON.stringify(allowed).includes('secretsmanager:GetSecretValue'),
        false
    )
    assert.equal(JSON.stringify(allowed).includes('sts:AssumeRole'), false)
    for (const statement of allowed) {
        const actions = [statement.Action].flat()
        assert.equal(actions.includes('rds:ModifyDBCluster'), false)
        assert.equal(actions.includes('rds:ModifyDBInstance'), false)
        if (actions.includes('rds:CreateDBInstance')) {
            assert.equal(
                statement.Condition.Bool['rds:PubliclyAccessible'],
                false
            )
            assert.equal(
                statement.Condition.StringEquals[
                    'aws:RequestTag/RestoreTestOwner'
                ],
                'prod'
            )
        }
        if (actions.includes('rds:DeleteDBCluster')) {
            assert.match(JSON.stringify(statement.Resource), /mcr-bkt-prod-/)
            assert.equal(
                statement.Condition.StringEquals[
                    'aws:ResourceTag/RestoreTestOwner'
                ],
                'prod'
            )
        }
    }
    const explicitDeleteDeny = statements.find(
        (statement) => statement.Effect === 'Deny' && statement.NotResource
    )
    assert.ok(explicitDeleteDeny)
    assert.match(
        JSON.stringify(explicitDeleteDeny.NotResource),
        /mcr-bkt-prod-/
    )
    assert.equal(
        JSON.stringify(explicitDeleteDeny.NotResource).includes(
            'postgres-prod-cluster-cdk'
        ),
        false
    )
})
void test('validator network can reach only copies on Postgres port; source gets HTTPS, not DB ingress', () => {
    const t = template('prod')
    const ingress = Object.values(
        t.findResources('AWS::EC2::SecurityGroupIngress')
    )
    const sourceRules = ingress.filter(
        (rule) => rule.Properties.GroupId === sourceGroupId
    )
    assert.ok(sourceRules.length)
    for (const rule of sourceRules) assert.equal(rule.Properties.FromPort, 443)
    const lambda = Object.values(t.findResources('AWS::Lambda::Function'))[0]
    assert.equal(lambda.Properties.VpcConfig.SecurityGroupIds.length, 1)
    assert.equal(
        JSON.stringify(lambda.Properties.VpcConfig).includes(sourceGroupId),
        false
    )
})
void test('review test is bound to its dev source, review database and owner namespace', () => {
    const t = template('review123')
    t.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
            Variables: {
                EXPECTED_DATABASE: 'reviewapp_review123',
                SOURCE_CLUSTER_IDENTIFIER: 'postgres-dev-cluster-cdk',
                RESTORE_CLUSTER_PREFIX: 'mcr-bkt-review123-',
            },
        },
    })
    const raw = JSON.stringify(t.toJSON())
    assert.match(raw, /environment:dev/)
    assert.equal(raw.includes('ssm:PutParameter'), false)
    assert.equal(raw.includes('postgres-prod-cluster-cdk'), false)
    assert.equal(
        backupRestoreConfig('review123', '123456789012').sourceStage,
        'dev'
    )
})
void test('only prod/main is scheduled; review CI is explicitly opt-in and tests both workspaces', () => {
    const root = join(__dirname, '../../..')
    const monthly = readFileSync(
        join(root, '.github/workflows/test-database-backups.yml'),
        'utf8'
    )
    const daily = readFileSync(
        join(root, '.github/workflows/check-database-backups.yml'),
        'utf8'
    )
    const review = readFileSync(
        join(root, '.github/workflows/deploy-cdk.yml'),
        'utf8'
    )
    assert.match(monthly, /cron: '0 9 1 \* \*'/)
    for (const text of [monthly, daily]) {
        assert.match(text, /github.ref == 'refs\/heads\/main'/)
        assert.match(text, /environment: prod/)
        assert.equal(text.includes('get_aws_credentials'), false)
        assert.match(text, /--stage prod/)
    }
    assert.match(daily, /--check/)
    assert.match(review, /test_native_backups/)
    assert.match(
        review,
        /if: github.event_name == 'workflow_dispatch' && inputs.test_native_backups/
    )
    assert.match(review, /pnpm --filter scripts test:backup-restore/)
    assert.match(review, /pnpm --filter mcr-infra-cdk test:backup-restore/)
})
