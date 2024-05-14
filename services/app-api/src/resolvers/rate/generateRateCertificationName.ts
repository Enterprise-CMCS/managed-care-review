import { formatRateNameDate } from '../../../../app-web/src/common-code/dateHelpers'
import type { RateFormEditableType } from '../../domain-models/contractAndRates'

const generateRateCertificationName = (
    rateFormData: RateFormEditableType,
    stateCode: string
): string => {
    const { rateType, rateDateCertified, rateDateStart } = rateFormData

    return `MCR-${stateCode.toUpperCase()}-${formatRateNameDate(rateDateStart)}-${rateType}-${formatRateNameDate(rateDateCertified)}`
}

export { generateRateCertificationName }
