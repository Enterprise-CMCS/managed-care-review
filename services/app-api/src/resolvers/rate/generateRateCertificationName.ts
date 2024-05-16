import { formatRateNameDate } from '../../../../app-web/src/common-code/dateHelpers'
import { programNames } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import type { ProgramArgType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import type { RateFormEditableType } from '../../domain-models/contractAndRates'

const naturalSort = (a: string, b: string): number => {
    return a.localeCompare(b, 'en', { numeric: true })
}

const generateRateCertificationName = (
    rateFormData: RateFormEditableType,
    stateCode: string,
    statePrograms: ProgramArgType[]
): string => {
    const {
        rateType,
        rateDateCertified,
        rateDateStart,
        rateDateEnd,
        rateProgramIDs = [],
        amendmentEffectiveDateStart,
        amendmentEffectiveDateEnd,
    } = rateFormData
    const pNames = programNames(statePrograms, rateProgramIDs)
        .sort(naturalSort)
        .map((n) =>
            n
                .replace(/\s/g, '-')
                .replace(/[^a-zA-Z0-9+]/g, '')
                .toUpperCase()
        )
        .join('-')

    let rateName = `MCR-${stateCode.toUpperCase()}-${pNames}`

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
