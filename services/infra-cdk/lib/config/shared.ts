/**
 * Shared Configuration
 * Only utilities used across multiple stacks
 */

export class ResourceNames {
    static stackName = (service: string, stage: string): string =>
        `${service}-${stage}-cdk`
    static resourceName = (
        service: string,
        resource: string,
        stage: string
    ): string => `${service}-${stage}-${resource}-cdk`
    static guardDutyMalwareProtectionRoleName = (stage: string): string =>
        `GuardDutyMalwareProtectionPassRole-${stage}`
    static apiName = (service: string, stage: string): string =>
        `${service}-${stage}-cdk`
}
