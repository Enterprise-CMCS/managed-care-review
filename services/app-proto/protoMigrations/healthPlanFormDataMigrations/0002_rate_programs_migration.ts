import { mcreviewproto } from '../../gen/healthPlanFormDataProto'

/**
 * There are old submitted contract and rate submissions in prod without `rateProgramsIDs` from before this field was
 * added to the proto schema and domain model. This migration is to add `rateProgramIDs` to those packages with the
 * package programs 'programsIDs`. This will be done in conjunction with the api fix, in `isValidRates`, that will require
 * contract and rate submissions to have a rate program on submission/resubmission.
 */

export function migrateProto(
    oldProto: mcreviewproto.IHealthPlanFormData
): mcreviewproto.IHealthPlanFormData {
    //Only perform migration on packages that:
    // - submitted contract and submission packages.
    // - contain at least one rate certification.
    // - package has programs
    const isSubmittedContractAndRates = oldProto.submissionType === 3 && oldProto.status === 'SUBMITTED'
    const hasPackagePrograms = oldProto.programIds && oldProto.programIds.length > 0
    const hasRates = oldProto.rateInfos && oldProto.rateInfos.length > 0
    if (isSubmittedContractAndRates && hasPackagePrograms && hasRates) {
        oldProto.rateInfos = oldProto?.rateInfos?.map(rateInfo => (
            {
                ...rateInfo,
                //If rate programs do not exist, then use package programs
                rateProgramIds: rateInfo.rateProgramIds && rateInfo.rateProgramIds.length > 0 ? rateInfo.rateProgramIds : oldProto.programIds
            }
        ))
    }

    return oldProto
}
