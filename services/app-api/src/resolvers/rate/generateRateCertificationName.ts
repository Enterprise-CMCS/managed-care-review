import { formatRateNameDate } from '../../../../app-web/src/common-code/dateHelpers'
import { programNames } from '../../common-code/healthPlanFormDataType'
import type { ProgramArgType } from '../../common-code/healthPlanFormDataType'
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

    const dateStart = rateDateStart
        ? `-${formatRateNameDate(rateDateStart)}`
        : ''
    const dateEnd = rateDateEnd ? `-${formatRateNameDate(rateDateEnd)}` : ''
    const effectiveStart = amendmentEffectiveDateStart
        ? `-${formatRateNameDate(amendmentEffectiveDateStart)}`
        : ''
    const effectiveEnd = amendmentEffectiveDateEnd
        ? `-${formatRateNameDate(amendmentEffectiveDateEnd)}`
        : ''
    const certifiedDate = rateDateCertified
        ? `-${formatRateNameDate(rateDateCertified)}`
        : ''
    const pNames = programNames(statePrograms, rateProgramIDs)
        .sort(naturalSort)
        .map((n) =>
            n
                .replace(/\s/g, '-')
                .replace(/[^a-zA-Z0-9+]/g, '')
                .toUpperCase()
        )
        .join('-')

    let rateName = `MCR-${stateCode.toUpperCase()}`

    if (pNames) {
        rateName = rateName.concat('-', pNames)
    }

    if (rateType === 'NEW') {
        rateName = rateName.concat(dateStart, dateEnd, '-', 'CERTIFICATION')
    }

    if (rateType === 'AMENDMENT') {
        rateName = rateName.concat(
            effectiveStart,
            effectiveEnd,
            '-',
            'AMENDMENT'
        )
    }

    if (rateDateCertified) {
        rateName = rateName.concat(certifiedDate)
    }

    return rateName
}

export { generateRateCertificationName }
