import { Construct } from 'constructs'
import {
    BlockPublicAccess,
    Bucket,
    BucketEncryption,
    type CorsRule,
    type IBucket,
    type IntelligentTieringConfiguration,
    type Inventory,
    type LifecycleRule,
    StorageClass,
} from 'aws-cdk-lib/aws-s3'
import {
    type AddToResourcePolicyResult,
    AnyPrincipal,
    Effect,
    type Grant,
    type IGrantable,
    PolicyStatement,
} from 'aws-cdk-lib/aws-iam'
import type { IKey } from 'aws-cdk-lib/aws-kms'
import { Duration, RemovalPolicy } from 'aws-cdk-lib'
import { ResourceNames } from '../../config/shared'

export interface SecureS3BucketProps {
    bucketName: string
    stage: string
    versioned?: boolean
    encryption?: BucketEncryption
    encryptionKey?: IKey
    blockPublicAccess?: BlockPublicAccess
    enforceSSL?: boolean
    removalPolicy?: RemovalPolicy
    autoDeleteObjects?: boolean
    serverAccessLogsBucket?: IBucket
    serverAccessLogsPrefix?: string
    cors?: CorsRule[]
    lifecycleRules?: LifecycleRule[]
    intelligentTieringConfigurations?: IntelligentTieringConfiguration[]
    inventories?: Inventory[]
}

/**
 * S3 bucket with security best practices
 */
export class SecureS3Bucket extends Construct {
    public readonly bucket: Bucket
    private readonly props: SecureS3BucketProps

    constructor(scope: Construct, id: string, props: SecureS3BucketProps) {
        super(scope, id)
        this.props = props

        // Create the bucket with security best practices
        this.bucket = new Bucket(this, 'Bucket', {
            bucketName: ResourceNames.resourceName(
                props.bucketName,
                'bucket',
                props.stage
            ),
            versioned: props.versioned ?? true,
            encryption: props.encryption ?? BucketEncryption.S3_MANAGED,
            encryptionKey: props.encryptionKey,
            blockPublicAccess:
                props.blockPublicAccess ?? BlockPublicAccess.BLOCK_ALL,
            enforceSSL: props.enforceSSL ?? true,
            removalPolicy:
                props.removalPolicy ??
                (props.stage === 'prod'
                    ? RemovalPolicy.RETAIN
                    : RemovalPolicy.DESTROY),
            autoDeleteObjects:
                props.autoDeleteObjects ?? props.stage !== 'prod',
            lifecycleRules:
                props.lifecycleRules ??
                this.getDefaultLifecycleRules(props.stage),
            cors: props.cors,
            intelligentTieringConfigurations:
                props.intelligentTieringConfigurations,
            inventories: props.inventories,
            // Only set access logs if a target bucket is explicitly provided
            serverAccessLogsBucket: props.serverAccessLogsBucket,
            serverAccessLogsPrefix: props.serverAccessLogsBucket
                ? props.serverAccessLogsPrefix || `${props.bucketName}/`
                : undefined,
        })

        // Add bucket policy to enforce SSL
        if (props.enforceSSL !== false) {
            this.addSSLOnlyPolicy()
        }

        // Apply CDK Nag suppressions
        this.applyCdkNagSuppressions()
    }

    /**
     * Get default lifecycle rules based on stage
     */
    private getDefaultLifecycleRules(stage: string): LifecycleRule[] {
        const rules: LifecycleRule[] = [
            {
                id: 'delete-incomplete-multipart-uploads',
                abortIncompleteMultipartUploadAfter: Duration.days(7),
            },
        ]

        // Add transition rules for non-dev environments
        if (stage !== 'dev') {
            rules.push({
                id: 'transition-to-ia',
                transitions: [
                    {
                        storageClass: StorageClass.INFREQUENT_ACCESS,
                        transitionAfter: Duration.days(30),
                    },
                ],
            })

            // Add Glacier transition for production
            if (stage === 'prod') {
                rules.push({
                    id: 'transition-to-glacier',
                    transitions: [
                        {
                            storageClass: StorageClass.GLACIER,
                            transitionAfter: Duration.days(90),
                        },
                    ],
                })
            }
        }

        // Add expiration for dev environment
        if (stage === 'dev') {
            rules.push({
                id: 'expire-old-objects',
                expiration: Duration.days(30),
            })
        }

        return rules
    }

    /**
     * Add bucket policy to enforce SSL connections
     */
    private addSSLOnlyPolicy(): void {
        this.bucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'DenyInsecureConnections',
                effect: Effect.DENY,
                principals: [new AnyPrincipal()],
                actions: ['s3:*'],
                resources: [
                    this.bucket.bucketArn,
                    `${this.bucket.bucketArn}/*`,
                ],
                conditions: {
                    Bool: {
                        'aws:SecureTransport': 'false',
                    },
                },
            })
        )
    }

    /**
     * Apply CDK Nag suppressions
     */
    private applyCdkNagSuppressions(): void {
        // CDK Nag suppressions temporarily disabled
        // Will be re-enabled once synthesis is working
    }

    /**
     * Grant read access to the bucket
     */
    public grantRead(identity: IGrantable): Grant {
        return this.bucket.grantRead(identity)
    }

    /**
     * Grant write access to the bucket
     */
    public grantWrite(identity: IGrantable): Grant {
        return this.bucket.grantWrite(identity)
    }

    /**
     * Grant read/write access to the bucket
     */
    public grantReadWrite(identity: IGrantable): Grant {
        return this.bucket.grantReadWrite(identity)
    }

    /**
     * Grant put access to the bucket
     */
    public grantPut(identity: IGrantable): Grant {
        return this.bucket.grantPut(identity)
    }

    /**
     * Grant delete access to the bucket
     */
    public grantDelete(identity: IGrantable): Grant {
        return this.bucket.grantDelete(identity)
    }

    /**
     * Add a bucket policy statement
     */
    public addToResourcePolicy(
        statement: PolicyStatement
    ): AddToResourcePolicyResult {
        return this.bucket.addToResourcePolicy(statement)
    }

    /**
     * Get the bucket ARN
     */
    public get bucketArn(): string {
        return this.bucket.bucketArn
    }

    /**
     * Get the bucket name
     */
    public get bucketName(): string {
        return this.bucket.bucketName
    }
}
