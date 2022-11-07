import { mcreviewproto } from '../../gen/healthPlanFormDataProto'
import { v4 as uuidv4 } from 'uuid'

/**
 * In preparation for rates across submissions. This migration is to generate an uuid for on existing submissions
 * with rate certifications. New submissions will have uuids generated when form data gets encoded into protobuffer
 * in toProtoBuffer.
 */

export function migrateProto(
    oldProto: mcreviewproto.IHealthPlanFormData
): mcreviewproto.IHealthPlanFormData {
    //Only generate rate certification id for submissions with at least 1 rate certification and protoVersion v3 and
    // earlier. Protobuf version 3 is when uuids are being generated for rate certification ids.
    if (oldProto.rateInfos && oldProto.rateInfos?.length > 0 && oldProto.protoVersion && oldProto.protoVersion <= 3) {
        oldProto.rateInfos = oldProto.rateInfos.map(rateInfo => rateInfo.id ? rateInfo : (
            {
                ...rateInfo,
                id: uuidv4()
            }
        ))
    }

    return oldProto
}
