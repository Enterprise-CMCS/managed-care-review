import { test } from 'node:test'
import assert from 'node:assert/strict'
import { App } from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'
import { Uploads } from '../lib/stacks/uploads'
import { CognitoStack } from '../lib/stacks/cognito'
import { VirusScanning } from '../lib/stacks/virus-scanning'
import { getEnvironment } from '../lib/config/environments'

process.env.AWS_REGION = 'us-east-1'
process.env.CDK_DEFAULT_ACCOUNT = '123456789012'
process.env.DEV_ACCOUNT_ID = '123456789012'
process.env.VAL_ACCOUNT_ID = '123456789012'
process.env.QA_ACCOUNT_ID = '123456789012'
process.env.PROD_ACCOUNT_ID = '123456789012'

const browserActions = [
    's3:GetObject',
    's3:PutObject',
    's3:AbortMultipartUpload',
    's3:ListMultipartUploadParts',
]

// A branch-name fixture representing an ephemeral review environment.
const reviewStage = 'fake-review-branch'

for (const stage of [reviewStage, 'dev', 'val', 'qa', 'prod']) {
    void test(`${stage}: both buckets protect tags, versions and conditional uploads`, () => {
        const stageConfig = getEnvironment(stage)
        assert.equal(
            stageConfig.environment,
            stage === reviewStage ? 'review' : stage
        )
        const app = new App()
        const stack = new Uploads(app, `uploads-${stage}-cdk`, {
            stage,
            stageConfig,
            serviceName: 'uploads',
        })
        const template = Template.fromStack(stack)
        const policies = Object.values(
            template.findResources('AWS::S3::BucketPolicy')
        )
        assert.equal(policies.length, 2)
        for (const policy of policies) {
            const statements = policy.Properties.PolicyDocument.Statement
            // Keep the Cognito identity ID as a private-path variable, not a
            // direct Condition key; select sessions with a supported global key.
            for (const statement of statements) {
                for (const operator of Object.keys(statement.Condition ?? {})) {
                    assert.ok(
                        !Object.hasOwn(
                            statement.Condition[operator],
                            'cognito-identity.amazonaws.com:sub'
                        ),
                        'Use S3/global condition keys, not a direct Cognito claim'
                    )
                }
            }
            assert.doesNotMatch(
                JSON.stringify(statements),
                /RestoreIAToStandard/
            )
            const statement = (sid: string) => {
                const result = statements.find(
                    (s: { Sid?: string }) => s.Sid === sid
                )
                assert.ok(result, `Missing ${sid}`)
                assert.equal(result.Effect, 'Deny')
                assert.deepEqual(result.Principal, { AWS: '*' })
                return result
            }
            const scanner = stack.resolve(
                `arn:${stack.partition}:iam::123456789012:role/GuardDutyMalwareProtectionPassRole-${stage}`
            )
            const management = statement('DenyBrowserObjectManagement')
            assert.deepEqual(management.NotAction, browserActions)
            assert.deepEqual(management.Condition, {
                StringEquals: {
                    'aws:FederatedProvider': 'cognito-identity.amazonaws.com',
                },
            })
            const prefixes = statement(
                'DenyBrowserUploadsOutsideApprovedPrefixes'
            )
            assert.match(JSON.stringify(prefixes.NotResource), /allusers\/\*/)
            assert.match(
                JSON.stringify(prefixes.NotResource),
                /private\/\$\{cognito-identity.amazonaws.com:sub\}\/\*/
            )
            assert.deepEqual(prefixes.Condition, management.Condition)

            const copies = statement('DenyBrowserObjectCopies')
            assert.deepEqual(copies.Condition, {
                StringEquals: management.Condition.StringEquals,
                Null: { 's3:x-amz-copy-source': 'false' },
            })
            const conditional = statement('DenyUnconditionalDocumentUploads')
            assert.equal(conditional.Action, 's3:PutObject')
            assert.deepEqual(conditional.Condition, {
                Bool: { 's3:ObjectCreationOperation': 'true' },
                StringNotEquals: { 's3:if-none-match': '*' },
            })
            // No Cognito selector: API presigned PUTs must not bypass this.
            assert.match(JSON.stringify(conditional.Resource), /allusers\/\*/)
            assert.match(JSON.stringify(conditional.Resource), /private\/\*/)
            assert.doesNotMatch(JSON.stringify(conditional.Resource), /zips/)

            const tags = statement('OnlyScannerCanChangeObjectTags')
            assert.deepEqual(tags.Action, [
                's3:PutObjectTagging',
                's3:PutObjectVersionTagging',
                's3:DeleteObjectTagging',
                's3:DeleteObjectVersionTagging',
            ])
            assert.deepEqual(tags.Condition, {
                ArnNotEquals: { 'aws:PrincipalArn': scanner },
            })
            const initial = statement('OnlyScannerCanSetInitialScanTags')
            assert.equal(initial.Action, 's3:PutObject')
            assert.deepEqual(initial.Condition, {
                'ForAnyValue:StringEquals': {
                    's3:RequestObjectTagKeys': ['GuardDutyMalwareScanStatus'],
                },
                ArnNotEquals: { 'aws:PrincipalArn': scanner },
            })
            const reads = statement('DenyInfectedFileAccess')
            assert.deepEqual(reads.Action, [
                's3:GetObject',
                's3:GetObjectVersion',
            ])
            assert.deepEqual(reads.Condition, {
                StringNotEquals: {
                    's3:ExistingObjectTag/GuardDutyMalwareScanStatus':
                        'NO_THREATS_FOUND',
                },
                ArnNotEquals: { 'aws:PrincipalArn': scanner },
            })
            assert.deepEqual(
                statement('DenyUnsupportedFileTypes').Condition.ArnNotEquals,
                { 'aws:PrincipalArn': scanner }
            )
        }
    })
}

void test('review browser role is limited to its own two buckets and required actions', () => {
    const stage = reviewStage
    const stack = new CognitoStack(new App(), `cognito-${stage}-cdk`, {
        stage,
        stageConfig: getEnvironment(stage),
        serviceName: 'cognito',
    })
    const policies = Object.values(
        Template.fromStack(stack).findResources('AWS::IAM::Policy')
    )
    const statements = policies.flatMap(
        (p) => p.Properties.PolicyDocument.Statement
    )
    const s3 = statements.find(
        (s) => Array.isArray(s.Action) && s.Action.includes('s3:PutObject')
    )
    assert.ok(s3)
    assert.deepEqual(s3.Action, browserActions)
    assert.deepEqual(
        s3.Resource,
        stack.resolve([
            `arn:${stack.partition}:s3:::uploads-documents-${stage}-bucket-cdk/allusers/*`,
            `arn:${stack.partition}:s3:::uploads-qa-${stage}-bucket-cdk/allusers/*`,
            `arn:${stack.partition}:s3:::uploads-documents-${stage}-bucket-cdk/private/\${cognito-identity.amazonaws.com:sub}/*`,
        ])
    )
    assert.doesNotMatch(JSON.stringify(statements), /arn:aws:s3:::\*\//)
})

void test('scan-tag exception uses the role configured by both malware protection plans', () => {
    const stage = reviewStage
    const app = new App({
        context: { 'guardduty-detector-id': 'offline-test-detector' },
    })
    const stack = new VirusScanning(app, `virus-scanning-${stage}-cdk`, {
        stage,
        stageConfig: getEnvironment(stage),
        serviceName: 'virus-scanning',
    })
    const template = Template.fromStack(stack)
    template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: `GuardDutyMalwareProtectionPassRole-${stage}`,
    })
    const plans = Object.values(
        template.findResources('AWS::GuardDuty::MalwareProtectionPlan')
    )
    assert.equal(plans.length, 2)
    const roles = template.findResources('AWS::IAM::Role')
    const scannerId = Object.keys(roles).find(
        (id) =>
            roles[id].Properties.RoleName ===
            `GuardDutyMalwareProtectionPassRole-${stage}`
    )
    for (const plan of plans) {
        assert.deepEqual(plan.Properties.Role, {
            'Fn::GetAtt': [scannerId, 'Arn'],
        })
        assert.deepEqual(plan.Properties.Actions, {
            Tagging: { Status: 'ENABLED' },
        })
    }
})
