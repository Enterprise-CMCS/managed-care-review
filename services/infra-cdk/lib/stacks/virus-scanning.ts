import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'
import { type Construct } from 'constructs'
import {
    Instance,
    InstanceType,
    InstanceClass,
    InstanceSize,
    Vpc,
    SecurityGroup,
    Port,
    UserData,
    Subnet,
    MachineImage,
    SubnetType,
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
import { CfnOutput, Duration, Fn, Tags } from 'aws-cdk-lib'
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

        // Create test connectivity function (temporary for debugging)
        this.createTestConnectivityFunction(lambdaRole)

        // Setup S3 event notifications for virus scanning
        this.setupS3EventNotifications()

        // Create outputs
        this.createOutputs()
    }

    /**
     * Validate required environment variables for VPC configuration
     */
    private validateEnvironment(): void {
        const required = ['VPC_ID', 'SG_ID', 'SUBNET_PUBLIC_A_ID']
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

        // Create inline user data script
        const userDataScript = UserData.forLinux()
        userDataScript.addCommands(
            '#!/bin/bash',
            'set -e',
            'exec > >(tee /var/log/clamav-bootstrap.log)',
            'exec 2>&1',
            '',
            'echo "=== ClamAV Bootstrap Script Starting ==="',
            'echo "Timestamp: $(date)"',
            '',
            'echo "=== Updating package list ==="',
            'apt-get update',
            '',
            'echo "=== Installing ClamAV packages ==="',
            'apt-get install -y clamav clamav-daemon',
            '',
            '# Setup SSH keys',
            "cat > /home/ubuntu/.ssh/authorized_keys << 'EOF'",
            'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDaR+UVq61k14jcuSFfoCfTxvB1IyhU3IQFp4OjpiN4fYMBjE9USeNoHon2ux8VTvL0nRc7Zn4g9HemxiDjdawUxh2oJ8GOTsiFTEWic2nf90SnbjBMn1OZELvMiZzoYDjQFvEp+AgETBA5nhrbHyxWQWIBa7A+XqiqnX0lcZ1p+x8sLIl4F0e583lJeuPQPVkpCicf2GDdtG1TnPxltqJgGaeVSONivpxeVofJwG4DCXy1b1xSo1NG0gzy9BWFJwOWKmZAk6nYq+rcxZg+TgU1x5WJ6z8/CS0PMSoTMRRIejm734PSmkGCU+WkR139Dl8o3DvQh/VQD71fxw30aONG98PSBJEUd5IouuiPPNYGP+fuDWgCBkaoA6JKlSVtbneNt1Qkm10FFHqExqzGWaSDeUCh6da3WG1BW4KZcC3MQ8CTEG47LFqUG5TvhklhiAAJH7cGF9W9SU1Beq2A6Wx1R/yGvgH/7U6X0/QfJi1ljY32pPzP2S+gzzOVGJgrMz3qRRgNvcY5k8EMbIuTK2yanFFHuVaWQq/zZW1T376oyHMfWdBB9WAtIKwpCgA5kYUu0XCo3XM0fWibZFIa/cEBNSKH1gEFKCBXolsc2+c4iZtdbG4YCHLgzOOqklERMEeK5dXq9Rz7UjoE91UVIyO2/d+mXmiVDRgtUsiQ34Sxyw== mojo.talantikite@gmail.com',
            'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDRrQOylmfnH6ptruU7nUzMvwkV6Q2WCFLJlGxbVTKlFiEepsSb4y/P3ZUL+regv8GZiZkWc+x1hiIGDQxF68nTSHv0G9otHeG44nrrQdeJ1rghy+eptyxIcAenUtP3eRhSR3c2/8IP7XPJutrFbQOADlQqwimKYrk1fdcONWt1TB1uPqk/i9mEdAcFn2VVQnWYbJ/mLwd0EPFqqnPFFnUzayaiYQnEZU9xLSSDYCurPEWuYDipJgyH0xsMloSwpV8U7m/v/4cPHU9E4NpnNY4Ke5DNljeqmZxQWbwZMGTWSYt7um3Zn5entr9iWJf0uu5nC03YPl3mgMxeu5wuui2HKiJBQCL1Yinz7ErRm7vR/Q11F8q3vyxey3tjNaMV7wMibtuQZh2ZdCGMlisoM9G44nS/EwDuuvt6PT87fgr2ur2SucOw52NokC6eO49DqXQXB5AVFnFoUMXTEQxz4Jq4uoEP9fz7cJVHrY5LVmtwy1yxoLujldhlRTg+G6bKOnY8embgFMJ+lBI8/R1N0f2r4EkTp3GwMgsDkZs3H/djaQMEdK7daKGYltwnXPiOR1Q0PNnnGMOctE9hSojiV1FX80aycYFEjmkOZzqUHJHgm6OPzYRC+CB5/OEBT+1MPjPcOXmMGa6JrNyc/LJeA5GOlj9JzRO3fOHnp4DlA4ZHEw== maolin@Maos-MacBook-Pro.local',
            'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDAk11E+dW51OKueXqW5fQmqAzjeJJVwob8QtiEh5JWAb7RRl7R67pRsoYRGQUp01D6PviEWlGU0gVoBENqhrM18sQCAH9oXoAn1hjwek8tXwh8oUJrGgUJOD/ZaHsRr5oLWUdSB7uYHw17B8VdcuK2EhEQx3dV6uS8ts1Kh+lqb3gdaS5BSQffKszY18TT9Mx9UgP2dwfEqr9cf40K5pm8l3M4G5grJK4taKKG8DopjBjQTMCOK44PBC77BkoEbzJPj+hQ1aZSlPsqcGcGFnzJyhwJkR2WeB5MyIN0eu2y4JKQ4vJWPINR4Jq7CTHtJsZUa39LNl5dJY1MuOFD1v/G4Zj+WsnLMAEpGaSUQ3ZoBC2aya2jfO972e41jNci4NfOtvNiycyJSAg6e6rRu7mfaLag2OUc7ZdAwWcamrYxnWWQjFGaVIzbgn4GHifJ0gtfsKYFHz/8UQctW44G5S3U8Du9UHKA//PaF8MWtLY9fNI6RnF2VlAuT2FiyoqbF5U= meghanmurphy@meghans-mbp.lan',
            'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCpKV/Qu1f9lv1OP0kiCvh56hRpGLOU6gSwPgvzglyak3mR8ec4quAcctaCgfOl/5dm7a3dhkY6WSCO09lSpixsNGiDEuGuESHis8GGOaepjq3jgrD7CkRvdSU8725XPNVwC9nZiUqgYbl8lCoCofCaTovKG1tiXTAMl6+RhRbv6AaJKOh+EYabmS0hTT/nv1QJ1P9aoMfMpx+FBFMDiCktjdsuPq5wLSVe9pxbzWI9PCTN55sRaBjbRcFdUdy+pT4B/lAKxJ5z7Oxq6QBI+SvvdnfPmkrCOg+9pEftuyLT+fURnsCIcs2DQJz2Pjkdv8xxwTNWB1+qfWC+LyJ934jcykJGtV/r4GZ2VzXGz0t7z7PgbkIdFHL3dg/JYR7cQdiCFwIa0Ml7bL5rKuQjNWXOBmCHME2lBol8jT1U1plYTjbz4kA6iCrfzgvQ5/MpkOfxRhLkSnYMCmYMOiRNskAW+FdZO5RD/0IFv0s0RUoJpD35Qt6TxBBP6TM0qPhuUlmTPQpWWTSwc/lSzVsEjSrAc/CxevC57A12JAsUcPFVljjAP+hjuGaHq41p2CrFyLqdIsP0td0uXk9CFUe+IuFGFP9OfhN/Kf/HOXWlE0YD1ZmV0k5sg1cEnyC0fusT9Tz0y/8MjzrJVjZBEvEEjlhk/aeo4Y6XLhVmGlMSXoYkgw== pearlroos@Pearls-MacBook-Pro.local',
            'EOF',
            'chown ubuntu:ubuntu /home/ubuntu/.ssh/authorized_keys',
            'chmod 600 /home/ubuntu/.ssh/authorized_keys',
            '',
            'echo "=== Configuring ClamAV ==="',
            '# Write to the clamd.conf',
            'echo "TCPSocket 3310" >> /etc/clamav/clamd.conf',
            'echo "TCPAddr 0.0.0.0" >> /etc/clamav/clamd.conf',
            "sed -i 's/^StreamMaxLength .*/StreamMaxLength 50M/' /etc/clamav/clamd.conf",
            '',
            '# Create systemd override directory',
            'mkdir -p /etc/systemd/system/clamav-daemon.service.d',
            '',
            '# Create systemd service override',
            'cat <<EOF > /etc/systemd/system/clamav-daemon.service.d/override.conf',
            '[Unit]',
            'After=network.target',
            'StartLimitIntervalSec=1h',
            'StartLimitBurst=5',
            'EOF',
            '',
            '# Fix the systemctl setting',
            "sed -i 's/^StandardOutput=syslog/StandardOutput=journal/' /lib/systemd/system/clamav-daemon.service",
            '',
            'echo "=== Reloading systemd ==="',
            'systemctl daemon-reload',
            '',
            'echo "=== Starting ClamAV services ==="',
            'systemctl enable clamav-daemon',
            'systemctl enable clamav-freshclam',
            'systemctl start clamav-freshclam',
            'sleep 10',
            'systemctl start clamav-daemon',
            '',
            'echo "=== Checking service status ==="',
            'systemctl status clamav-daemon',
            'systemctl status clamav-freshclam',
            '',
            'echo "=== Bootstrap script completed ==="',
            'echo "Timestamp: $(date)"'
        )

        // Create the IAM role for the EC2 instance
        const instanceRole = this.createClamavInstanceRole()

        // Create EC2 instance
        const instance = new Instance(this, 'ClamavInstanceV001', {
            instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.SMALL),
            machineImage: MachineImage.genericLinux({
                'us-east-1': 'ami-0c7217cdde317cfec',
            }),
            vpc,
            vpcSubnets: {
                subnetType: SubnetType.PUBLIC,
                subnetFilters: [
                    {
                        selectSubnets: (subnets) =>
                            subnets.filter(
                                (subnet) =>
                                    subnet.subnetId ===
                                    process.env.SUBNET_PUBLIC_A_ID!
                            ),
                    },
                ],
            },
            securityGroup: clamavSecurityGroup,
            userData: userDataScript,
            associatePublicIpAddress: true,
            role: instanceRole,
        })

        // Add tags to match serverless configuration
        Tags.of(instance).add('Name', `clamavd-${this.stage}`)
        Tags.of(instance).add('mcr-vmuse', 'clamavd')

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
        let scriptContent = fs.readFileSync(scriptPath, 'utf8')

        // Replace CloudFormation variables with actual values
        scriptContent = scriptContent.replace(
            '${AWS::StackName}',
            this.stackName
        )
        scriptContent = scriptContent.replace('${AWS::Region}', this.region)

        const userData = UserData.forLinux()
        userData.addCommands(scriptContent)

        return userData
    }

    /**
     * Create IAM role for ClamAV EC2 instance
     * Matches serverless ClamAVInstanceRole configuration
     */
    private createClamavInstanceRole(): Role {
        const role = new Role(this, 'ClamAVInstanceRoleV001', {
            assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
            description: 'IAM role for ClamAV EC2 instance',
            path: '/delegatedadmin/developer/',
            permissionsBoundary: ManagedPolicy.fromManagedPolicyArn(
                this,
                'ClamAVPermissionsBoundary',
                `arn:aws:iam::${this.account}:policy/cms-cloud-admin/ct-ado-poweruser-permissions-boundary-policy`
            ),
            roleName: `clamavdVm-${this.stage}-ServiceRole`,
        })

        // Add ClamAV instance policy (matches serverless)
        role.addToPolicy(
            new PolicyStatement({
                sid: 'ClamAVInstancePolicy',
                effect: Effect.ALLOW,
                actions: [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                ],
                resources: ['*'],
            })
        )

        return role
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
        const role = new Role(this, 'VirusScanLambdaRoleV001', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            description: 'Execution role for virus scanning Lambda functions',
            path: process.env.IAM_PATH || '/delegatedadmin/developer/',
            permissionsBoundary: ManagedPolicy.fromManagedPolicyArn(
                this,
                'VirusScanPermissionsBoundary',
                process.env.IAM_PERMISSIONS_BOUNDARY ||
                    `arn:aws:iam::${this.account}:policy/cms-cloud-admin/ct-ado-poweruser-permissions-boundary-policy`
            ),
        })

        // Basic Lambda execution permissions
        role.addManagedPolicy(
            ManagedPolicy.fromAwsManagedPolicyName(
                'service-role/AWSLambdaVPCAccessExecutionRole'
            )
        )

        // S3 permissions for scanning files and managing definitions (matches serverless exactly)
        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    's3:GetObject',
                    's3:GetObjectTagging',
                    's3:PutObject',
                    's3:PutObjectAcl',
                    's3:PutObjectTagging',
                    's3:PutObjectVersionTagging',
                    's3:DeleteObject',
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

        // ListBucket permissions (separate statement like serverless)
        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['s3:ListBucket'],
                resources: [
                    documentUploadsBucketArn,
                    qaUploadsBucketArn,
                    this.avDefinitionsBucket.bucketArn,
                ],
            })
        )

        // Lambda invocation permissions (matches serverless - for future rescan functions)
        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['lambda:InvokeFunction'],
                resources: [
                    `arn:aws:lambda:${this.region}:${this.account}:function:${ResourceNames.apiName('virus-scanning', this.stage)}-avAuditFiles`,
                    `arn:aws:lambda:${this.region}:${this.account}:function:${ResourceNames.apiName('virus-scanning', this.stage)}-rescanWorker`,
                ],
            })
        )

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
                subnets: [
                    Subnet.fromSubnetId(
                        this,
                        'LambdaPrivateA',
                        process.env.SUBNET_PRIVATE_A_ID!
                    ),
                    Subnet.fromSubnetId(
                        this,
                        'LambdaPrivateB',
                        process.env.SUBNET_PRIVATE_B_ID!
                    ),
                    Subnet.fromSubnetId(
                        this,
                        'LambdaPrivateC',
                        process.env.SUBNET_PRIVATE_C_ID!
                    ),
                ],
            },
            securityGroups: [lambdaSecurityGroup],
            bundling: this.createVirusScanBundling('av-scan'),
        })
    }

    /**
     * Create test connectivity Lambda function (temporary for debugging)
     */
    private createTestConnectivityFunction(role: Role): NodejsFunction {
        // Import VPC for Lambda function
        const vpc = Vpc.fromLookup(this, 'TestConnectivityVpc', {
            vpcId: process.env.VPC_ID!,
        })

        const lambdaSecurityGroup = SecurityGroup.fromSecurityGroupId(
            this,
            'TestConnectivitySecurityGroup',
            process.env.SG_ID!
        )

        return new NodejsFunction(this, 'TestConnectivityFunction', {
            functionName: `${ResourceNames.apiName('virus-scanning', this.stage)}-test-connectivity`,
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
                'testConnectivity.ts'
            ),
            timeout: Duration.seconds(30),
            memorySize: 512,
            environment: {
                CLAMAV_HOST: 'clamav.mc-review-cdk.local',
                CLAMAV_PORT: '3310',
                stage: this.stage,
            },
            role,
            vpc,
            vpcSubnets: {
                subnets: [
                    Subnet.fromSubnetAttributes(
                        this,
                        'TestConnectivityPrivateA',
                        {
                            subnetId: process.env.SUBNET_PRIVATE_A_ID!,
                            availabilityZone: this.availabilityZones[0],
                        }
                    ),
                ],
            },
            securityGroups: [lambdaSecurityGroup],
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
