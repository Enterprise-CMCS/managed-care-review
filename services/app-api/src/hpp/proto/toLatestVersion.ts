/* 
Right now when we use proto data directly after it is deserialized to typescript. 
  As a reminder, most changes are proto is very backwards compatible. However, we run into compatibility issues with our typescript domain models.
  With a schema versioning approach, we handle this problem via data translation based on schema version numbers
  This is so that deserialized data can be converted to latest version before going to the consumer (frontend React client or backend API).
  
  When we know we have a change that could raise backwards/forwards compatibility issues, we 
   - increment the "version" field of the healthplanformdataproto schema
   - add a new function within `toLatestVersion` to convert between the known schema versions
   - for records, keep an old the old version of the proto schema to a folder /previousVersions for reference.
  
  toLatestVersion is an quick example of this kind of data translation function - it makes a proto compatible change 
  and updates the data in a proto to  match the latest schema 
*/
import type { mcreviewproto } from './healthPlanFormDataProto'

const CURRENT_PROTO_VERSION = 4

const updateToVersion3 = (oldProto: mcreviewproto.HealthPlanFormData) => {
    // We can assume the proto version exists because error would have been thrown in toDomain

    if (oldProto.protoVersion! < 3) {
        const updatedProto = Object.assign({}, oldProto)

        // Use actuary contacts fields from the second actuary contact onward to fill in data for new field addtlActuaryContacts
        // The first actuary is the certifying actuary contact and will be displayed on the Rate Details.
        updatedProto.addtlActuaryContacts = oldProto.rateInfos[0]
            ?.actuaryContacts?.length
            ? oldProto.rateInfos[0]?.actuaryContacts?.slice(1)
            : []
        updatedProto.addtlActuaryCommunicationPreference =
            oldProto.rateInfos[0]?.actuaryCommunicationPreference

        // Bump version
        updatedProto.protoVersion = 3
        return updatedProto
    } else {
        return oldProto
    }
}

const toLatestProtoVersion = (proto: mcreviewproto.HealthPlanFormData) => {
    const { protoVersion, protoName } = proto
    // First things first, let's check the protoName and protoVersion
    if (protoName !== 'STATE_SUBMISSION') {
        console.warn(
            `WARNING: We are unboxing a proto our code doesn't recognize:`,
            protoName,
            protoVersion
        )
    }

    if (protoVersion === CURRENT_PROTO_VERSION) {
        // if we know we are in the latest proto, exit function and return initial proto
        return proto
    } else {
        // if the proto is an outdated version convert it to the latest
        // console.info(
        //     `Trying to open outdated proto. State: ${proto.stateCode}, Package ID: ${proto.id}, Outdated proto version: ${protoVersion}`
        // )

        const v3Compatible = updateToVersion3(proto)

        // future incompatible version update functions can go here ...

        const latestProto = v3Compatible
        return latestProto
    }
}

export { toLatestProtoVersion, CURRENT_PROTO_VERSION }
