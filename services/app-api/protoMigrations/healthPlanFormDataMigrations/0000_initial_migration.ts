import { mcreviewproto } from '../gen/healthPlanFormDataProto'

/*
 * This is our first pass at a migration, the intention is to run this migration through prod
 * first of all so that there are no important code changes that are associated with it.
 * This migration just bumps the version number of our protos, nothing more.
 */

export function migrateProto(
    oldProto: mcreviewproto.IHealthPlanFormData
): mcreviewproto.IHealthPlanFormData {
    if (oldProto.protoVersion !== 1) {
        console.log('Unexpected proto version!: ', oldProto.protoVersion)
    }

    oldProto.protoVersion = 2

    return oldProto
}
