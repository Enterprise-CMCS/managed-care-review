import { mcreviewproto } from '../../gen/healthPlanFormDataProto'

/**
 * In preparation for rates across submissions. This migration is to generate an uuid for on existing submissions
 * with rate certifications. New submissions will have uuids generated when form data gets encoded into protobuffer
 * in toProtoBuffer.
 */

export function migrateProto(
    oldProto: mcreviewproto.IHealthPlanFormData
): mcreviewproto.IHealthPlanFormData {
    const { v4: uuidv4 } = require('uuid');
    //Only perform migration on contract and submission packages that contain a rate certification.
    if (oldProto.submissionType === 3 && oldProto.rateInfos && oldProto.rateInfos?.length > 0) {
        oldProto.rateInfos = oldProto.rateInfos.map(rateInfo => (
            {
                ...rateInfo,
                id: rateInfo.id ?? uuidv4()
            }
        ))
    }

    return oldProto
}
