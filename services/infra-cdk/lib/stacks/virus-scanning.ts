import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'
import { type Construct } from 'constructs'
import {
    Instance,
    InstanceType,
    InstanceClass,
    InstanceSize,
    MachineImage,
    Vpc,
    SecurityGroup,
    SubnetType,
    Port,
    UserData,
} from 'aws-cdk-lib/aws-ec2'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import {
    Architecture,
    Runtime,
    LayerVersion,
    type ILayerVersion,
    Code,
} from 'aws-cdk-lib/aws-lambda'
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3'
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications'
import {
    Role,
    ServicePrincipal,
    PolicyStatement,
    Effect,
    ManagedPolicy,
} from 'aws-cdk-lib/aws-iam'
// Note: EventBridge imports removed since rescan scheduling not implemented initially
import { CfnOutput, Duration, Fn } from 'aws-cdk-lib'
import { HostedZone, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53'
import { ResourceNames } from '../config'
import { AWS_OTEL_LAYER_ARN } from './lambda-layers'
import path from 'path'
import * as fs from 'fs'
import type { BundlingOptions } from 'aws-cdk-lib/aws-lambda-nodejs'

export interface VirusScanningProps extends BaseStackProps {
    // No additional props needed - will import bucket ARNs from uploads stack
}

/**
 * Virus Scanning stack - ClamAV-based virus scanning for uploaded files
 * Replicates the serverless virus scanning implementation in CDK
 */
export class VirusScanning extends BaseStack {
    // S3 bucket for AV definitions
    public readonly avDefinitionsBucket: Bucket

    // ClamAV daemon EC2 instance
    public readonly clamavInstance: Instance

    // Route53 private hosted zone for internal DNS
    public readonly internalZone: HostedZone

    // Lambda function
    public readonly avScanFunction: NodejsFunction

    // Shared OTEL layer
    private readonly otelLayer: ILayerVersion

    // ClamAV layer
    private readonly clamAvLayer: ILayerVersion

    constructor(scope: Construct, id: string, props: VirusScanningProps) {
        super(scope, id, {
            ...props,
            description:
                'Virus Scanning - ClamAV daemon and Lambda functions for file scanning',
        })

        // Validate required environment variables
        this.validateEnvironment()

        // Create shared OTEL layer
        this.otelLayer = LayerVersion.fromLayerVersionArn(
            this,
            'VirusScanOtelLayer',
            AWS_OTEL_LAYER_ARN
        )

        // Create ClamAV layer from zip file built by CI
        this.clamAvLayer = new LayerVersion(this, 'ClamAvLayer', {
            layerVersionName: `${ResourceNames.apiName('virus-scanning', this.stage)}-clamav`,
            description: 'ClamAV binaries and libraries for virus scanning',
            compatibleRuntimes: [Runtime.NODEJS_20_X],
            compatibleArchitectures: [Architecture.X86_64],
            code: Code.fromAsset(
                path.join(__dirname, '..', '..', 'lambda-layers-clamav')
            ),
        })

        // Create AV definitions bucket
        this.avDefinitionsBucket = this.createAvDefinitionsBucket()

        // Create Route53 private hosted zone for internal DNS
        this.internalZone = this.createInternalHostedZone()

        // Create ClamAV daemon EC2 instance
        this.clamavInstance = this.createClamavInstance()

        // Create DNS record for ClamAV instance
        this.createClamavDnsRecord()

        // Create Lambda execution role
        const lambdaRole = this.createLambdaRole()

        // Create Lambda function
        this.avScanFunction = this.createAvScanFunction(lambdaRole)

        // Setup S3 event notifications for virus scanning
        this.setupS3EventNotifications()

        // Create outputs
        this.createOutputs()
    }

    /**
     * Validate required environment variables for VPC configuration
     */
    private validateEnvironment(): void {
        const required = ['VPC_ID', 'SG_ID']
        const missing = required.filter((envVar) => !process.env[envVar])

        if (missing.length > 0) {
            throw new Error(
                `Missing required environment variables for virus scanning: ${missing.join(', ')}`
            )
        }
    }

    /**
     * Create S3 bucket for storing ClamAV definitions
     */
    private createAvDefinitionsBucket(): Bucket {
        return new Bucket(this, 'AvDefinitionsBucket', {
            bucketName: ResourceNames.resourceName(
                'virus-scanning',
                'avscan',
                this.stage
            ),
            versioned: false,
            publicReadAccess: false,
        })
    }

    /**
     * Create ClamAV daemon EC2 instance
     */
    private createClamavInstance(): Instance {
        // Import VPC from environment variables
        const vpc = Vpc.fromLookup(this, 'ClamavVpc', {
            vpcId: process.env.VPC_ID!,
        })

        // Create security group for ClamAV daemon
        const clamavSecurityGroup = new SecurityGroup(
            this,
            'ClamavSecurityGroup',
            {
                vpc,
                description: 'Security group for ClamAV daemon',
                allowAllOutbound: true,
            }
        )

        // Allow Lambda functions to connect to ClamAV daemon on port 3310
        const lambdaSecurityGroup = SecurityGroup.fromSecurityGroupId(
            this,
            'LambdaSecurityGroup',
            process.env.SG_ID!
        )

        clamavSecurityGroup.addIngressRule(
            lambdaSecurityGroup,
            Port.tcp(3310),
            'Allow Lambda functions to connect to ClamAV daemon'
        )

        // Load bootstrap script from external file
        const userDataScript = this.createClamavUserDataScript()

        // Create EC2 instance
        const instance = new Instance(this, 'ClamavInstance', {
            instanceType: InstanceType.of(
                InstanceClass.T3,
                InstanceSize.MEDIUM
            ),
            machineImage: MachineImage.latestAmazonLinux2023(),
            vpc,
            vpcSubnets: {
                subnetType: SubnetType.PUBLIC, // Need public subnet for package downloads
            },
            securityGroup: clamavSecurityGroup,
            userData: userDataScript,
            keyName: undefined, // No SSH key needed
        })

        return instance
    }

    /**
     * Create user data script from external shell script file
     */
    private createClamavUserDataScript(): UserData {
        const scriptPath = path.join(
            __dirname,
            '..',
            '..',
            'scripts',
            'clamav-bootstrap.sh'
        )
        const scriptContent = fs.readFileSync(scriptPath, 'utf8')

        const userData = UserData.forLinux()
        userData.addCommands(scriptContent)

        return userData
    }

    /**
     * Create Route53 private hosted zone for internal DNS resolution
     * Matches serverless MCRInternalZone configuration
     */
    private createInternalHostedZone(): HostedZone {
        // Import VPC for the hosted zone
        const vpc = Vpc.fromLookup(this, 'InternalZoneVpc', {
            vpcId: process.env.VPC_ID!,
        })

        return new HostedZone(this, 'MCRInternalZone', {
            zoneName: 'mc-review-cdk.local',
            vpcs: [vpc],
            comment: 'Private hosted zone for mc-review CDK services',
        })
    }

    /**
     * Create DNS A record for ClamAV instance
     * Matches serverless ClamAVRecordSet configuration
     */
    private createClamavDnsRecord(): ARecord {
        return new ARecord(this, 'ClamAVRecordSet', {
            zone: this.internalZone,
            recordName: 'clamav',
            target: RecordTarget.fromIpAddresses(
                this.clamavInstance.instancePrivateIp
            ),
            ttl: Duration.seconds(300),
        })
    }

    /**
     * Create Lambda execution role with required permissions
     */
    private createLambdaRole(): Role {
        // Import bucket ARNs from uploads stack outputs
        const uploadsStackName = ResourceNames.stackName('uploads', this.stage)
        const documentUploadsBucketArn = Fn.importValue(
            `${uploadsStackName}-DocumentUploadsBucketArn`
        )
        const qaUploadsBucketArn = Fn.importValue(
            `${uploadsStackName}-QAUploadsBucketArn`
        )
        const role = new Role(this, 'VirusScanLambdaRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            description: 'Execution role for virus scanning Lambda functions',
        })

        // Basic Lambda execution permissions
        role.addManagedPolicy(
            ManagedPolicy.fromAwsManagedPolicyName(
                'service-role/AWSLambdaVPCAccessExecutionRole'
            )
        )

        // S3 permissions for scanning files and managing definitions
        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    's3:GetObject',
                    's3:GetObjectTagging',
                    's3:PutObjectTagging',
                    's3:ListBucket',
                ],
                resources: [
                    documentUploadsBucketArn,
                    `${documentUploadsBucketArn}/*`,
                    qaUploadsBucketArn,
                    `${qaUploadsBucketArn}/*`,
                    this.avDefinitionsBucket.bucketArn,
                    `${this.avDefinitionsBucket.bucketArn}/*`,
                ],
            })
        )

        // Note: Lambda invocation permissions for rescan workers removed
        // (rescan functions not implemented in initial CDK version)

        return role
    }

    /**
     * Create common OTEL bundling configuration for virus scanning functions
     */
    private createVirusScanBundling(functionName: string): BundlingOptions {
        return {
            commandHooks: {
                beforeBundling(inputDir: string, outputDir: string): string[] {
                    return [
                        `echo "CDK ${functionName} inputDir: ${inputDir}"`,
                        `find ${inputDir} -name "collector.yml" 2>/dev/null || true`,
                    ]
                },
                beforeInstall(): string[] {
                    return []
                },
                afterBundling(inputDir: string, outputDir: string): string[] {
                    const repoRoot =
                        '/home/runner/work/managed-care-review/managed-care-review'
                    const uploadsPath = `${repoRoot}/services/uploads`
                    return [
                        // Copy collector.yml for OTEL configuration
                        `cp ${uploadsPath}/collector.yml ${outputDir}/collector.yml || echo "collector.yml not found at ${uploadsPath}/collector.yml"`,
                        // Replace license key placeholder with actual value
                        `sed -i 's/\\\\$NR_LICENSE_KEY/${process.env.NR_LICENSE_KEY || ''}/g' "${outputDir}/collector.yml"`,

                        // Copy clamd.conf for ClamAV remote daemon configuration
                        `cp ${uploadsPath}/src/avLayer/clamd.conf ${outputDir}/clamd.conf || echo "clamd.conf not found at ${uploadsPath}/src/avLayer/clamd.conf"`,
                        // Replace serverless hostname with CDK hostname
                        `sed -i 's/clamav\\.mc-review\\.local/clamav.mc-review-cdk.local/g' "${outputDir}/clamd.conf"`,
                    ]
                },
            },
        }
    }

    /**
     * Create the main virus scanning Lambda function
     */
    private createAvScanFunction(role: Role): NodejsFunction {
        // Import VPC for Lambda function
        const vpc = Vpc.fromLookup(this, 'AvScanVpc', {
            vpcId: process.env.VPC_ID!,
        })

        const lambdaSecurityGroup = SecurityGroup.fromSecurityGroupId(
            this,
            'AvScanSecurityGroup',
            process.env.SG_ID!
        )

        return new NodejsFunction(this, 'AvScanFunction', {
            functionName: `${ResourceNames.apiName('virus-scanning', this.stage)}-av-scan`,
            runtime: Runtime.NODEJS_20_X,
            architecture: Architecture.X86_64,
            handler: 'main',
            entry: path.join(
                __dirname,
                '..',
                '..',
                '..',
                'uploads',
                'src',
                'lambdas',
                'avScan.ts'
            ),
            timeout: Duration.seconds(300), // 5 minutes
            memorySize: 4096, // Large memory for file processing
            environment: this.getVirusScanEnvironment(),
            role,
            layers: [this.clamAvLayer, this.otelLayer],
            vpc,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [lambdaSecurityGroup],
            bundling: this.createVirusScanBundling('av-scan'),
        })
    }

    // Note: rescanFailedFiles and rescanWorker functions removed from initial implementation
    // These are maintenance/recovery functions that can be added later if needed

    /**
     * Get environment variables for virus scanning Lambda functions
     */
    private getVirusScanEnvironment(): Record<string, string> {
        return {
            // OTEL configuration (matches uploads serverless pattern)
            VITE_APP_OTEL_COLLECTOR_URL:
                process.env.VITE_APP_OTEL_COLLECTOR_URL || '',
            AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
            OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',

            // Virus scanning configuration
            CLAMAV_BUCKET_NAME: this.avDefinitionsBucket.bucketName,
            PATH_TO_AV_DEFINITIONS: 'lambda/s3-antivirus/av-definitions',
            CLAMAV_HOST: 'clamav.mc-review-cdk.local',
            CLAMAV_PORT: '3310',

            // Stage info (matches serverless pattern)
            stage: this.stage,
        }
    }

    /**
     * Setup S3 event notifications to trigger virus scanning
     * Uses BucketNotifications to configure notifications on existing buckets
     */
    private setupS3EventNotifications(): void {
        // Import bucket ARNs from uploads stack outputs
        const uploadsStackName = ResourceNames.stackName('uploads', this.stage)
        const documentUploadsBucketName = Fn.importValue(
            `${uploadsStackName}-DocumentUploadsBucketName`
        )
        const qaUploadsBucketName = Fn.importValue(
            `${uploadsStackName}-QAUploadsBucketName`
        )

        // Get bucket references by name (they're in the same account/region)
        const documentUploadsBucket = Bucket.fromBucketName(
            this,
            'DocumentUploadsBucket',
            documentUploadsBucketName
        )

        const qaUploadsBucket = Bucket.fromBucketName(
            this,
            'QaUploadsBucket',
            qaUploadsBucketName
        )

        // Configure S3 event notifications to trigger virus scanning
        // Note: This will create the BucketNotificationsHandler Python Lambda
        documentUploadsBucket.addEventNotification(
            EventType.OBJECT_CREATED,
            new LambdaDestination(this.avScanFunction)
        )

        qaUploadsBucket.addEventNotification(
            EventType.OBJECT_CREATED,
            new LambdaDestination(this.avScanFunction)
        )
    }

    // Note: rescan schedule removed since rescan functions are not implemented initially

    /**
     * Create CloudFormation outputs
     */
    private createOutputs(): void {
        new CfnOutput(this, 'AvDefinitionsBucketName', {
            value: this.avDefinitionsBucket.bucketName,
            exportName: `${this.stackName}-AvDefinitionsBucketName`,
            description: 'Name of the S3 bucket storing ClamAV definitions',
        })

        new CfnOutput(this, 'ClamavInstanceId', {
            value: this.clamavInstance.instanceId,
            exportName: `${this.stackName}-ClamavInstanceId`,
            description: 'ID of the ClamAV daemon EC2 instance',
        })

        new CfnOutput(this, 'AvScanFunctionArn', {
            value: this.avScanFunction.functionArn,
            exportName: `${this.stackName}-AvScanFunctionArn`,
            description: 'ARN of the virus scanning Lambda function',
        })
    }
}
