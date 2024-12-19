import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

interface UiStackProps extends cdk.StackProps {
    stage: string
}

export class UiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: UiStackProps) {
        super(scope, id, props)
    }
}
