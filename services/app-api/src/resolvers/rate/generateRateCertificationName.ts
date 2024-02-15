import { formatRateNameDate } from '../../../../app-web/src/common-code/dateHelpers'
import { packageName } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import type { ProgramArgType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import type { RateFormDataType } from '../../domain-models/contractAndRates'

const generateRateCertificationName = (
    rateFormData: RateFormDataType,
    stateCode: string,
    stateNumber: number,
    statePrograms: ProgramArgType[]
): string => {
    const {
        rateType,
        rateProgramIDs,
        amendmentEffectiveDateEnd,
        amendmentEffectiveDateStart,
        rateDateCertified,
        rateDateEnd,
        rateDateStart,
    } = rateFormData

    let rateName = `${packageName(
        stateCode,
        stateNumber,
        rateProgramIDs ?? [],
        statePrograms
    )}-RATE`
    if (rateType === 'NEW' && rateDateStart) {
        rateName = rateName.concat(
            '-',
            formatRateNameDate(rateDateStart),
            '-',
            formatRateNameDate(rateDateEnd),
            '-',
            'CERTIFICATION'
        )
    }

    if (rateType === 'AMENDMENT') {
        rateName = rateName.concat(
            '-',
            formatRateNameDate(amendmentEffectiveDateStart),
            '-',
            formatRateNameDate(amendmentEffectiveDateEnd),
            '-',
            'AMENDMENT'
        )
    }

    if (rateDateCertified) {
        rateName = rateName.concat('-', formatRateNameDate(rateDateCertified))
    }
    return rateName
}

export { generateRateCertificationName }
