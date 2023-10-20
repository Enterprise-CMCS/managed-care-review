import type { HealthPlanFormDataType } from '../../../app-web/src/common-code/healthPlanFormDataType'
import { base64ToDomain } from '../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import type { HealthPlanPackage } from '../gen/gqlServer'

// returns the latest form data for this package, will throw an error if unwrapping fails
// hence, this function is meant for making clean tests, not for business logic.
export function latestFormData(pkg: HealthPlanPackage): HealthPlanFormDataType {
    const latestRevision = pkg.revisions[0].node
    if (!latestRevision) {
        throw new Error('no revisions found for package' + pkg.id)
    }

    const unwrapResult = base64ToDomain(latestRevision.formDataProto)
    if (unwrapResult instanceof Error) {
        throw unwrapResult
    }

    return unwrapResult
}

export function previousFormData(
    pkg: HealthPlanPackage
): HealthPlanFormDataType {
    const latestRevision = pkg.revisions[1].node
    if (!latestRevision) {
        throw new Error('no previous revisions found for package' + pkg.id)
    }

    const unwrapResult = base64ToDomain(latestRevision.formDataProto)
    if (unwrapResult instanceof Error) {
        throw unwrapResult
    }

    return unwrapResult
}
