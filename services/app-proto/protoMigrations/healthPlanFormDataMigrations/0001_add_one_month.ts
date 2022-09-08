import { mcreviewproto } from '../../gen/healthPlanFormDataProto'

/*
 * When we were encoding CalendarDates as js Date objects, we were writing those
 * dates into and out of proto without accounting for the fact that js Date's months
 * are zero indexed. So we were storing months in protos as zero indexed. This migration
 * adds one to the month in every CalendarDate in the proto, so we can have 1 indexed months.
 */

export function migrateProto(
    oldProto: mcreviewproto.IHealthPlanFormData
): mcreviewproto.IHealthPlanFormData {
    if (oldProto.contractInfo?.contractDateStart?.month) {
        oldProto.contractInfo.contractDateStart.month += 1
    }

    if (oldProto.contractInfo?.contractDateEnd?.month) {
        oldProto.contractInfo.contractDateEnd.month += 1
    }

    const rateInfos = oldProto.rateInfos || []
    for (const rateInfo of rateInfos) {
        if (rateInfo.rateDateStart?.month) {
            rateInfo.rateDateStart.month += 1
        }

        if (rateInfo.rateDateEnd?.month) {
            rateInfo.rateDateEnd.month += 1
        }

        if (rateInfo.rateDateCertified?.month) {
            rateInfo.rateDateCertified.month += 1
        }

        if (rateInfo.rateAmendmentInfo?.effectiveDateStart?.month) {
            rateInfo.rateAmendmentInfo.effectiveDateStart.month += 1
        }

        if (rateInfo.rateAmendmentInfo?.effectiveDateEnd?.month) {
            rateInfo.rateAmendmentInfo.effectiveDateEnd.month += 1
        }
    }

    return oldProto
}
