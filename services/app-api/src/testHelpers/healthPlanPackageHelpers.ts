import { HealthPlanFormDataType } from '@managed-care-review/common-code/healthPlanFormDataType'
import { base64ToDomain } from '@managed-care-review/common-code/proto'
import { HealthPlanPackage } from '../gen/gqlServer'

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
