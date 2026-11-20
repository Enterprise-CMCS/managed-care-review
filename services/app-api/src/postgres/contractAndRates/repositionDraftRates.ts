import type {
    ILOSExternalRateType,
    RateFormEditableType,
} from '../../domain-models/contractAndRates'
import type { UpdateDraftContractRatesArgsType } from './updateDraftContractRates'

type RateUpdatesType = UpdateDraftContractRatesArgsType['rateUpdates']

type RateToRepositionType = {
    id: string
    parentContractID: string
    ratePosition?: number
    draftRevision?: { formData: RateFormEditableType }
}

/**
 * Renumbers the rates on a draft contract and sorts them into the lists
 * updateDraftContractRates takes.
 *
 * Child rates, linked rates and ILOS external rates share one position
 * sequence. This sorts them by position and numbers them 1 to n, so a rate that
 * was removed leaves no gap. A rate with no position yet goes last.
 *
 * @param contractID - The contract the rates are on. Rates it is the parent of are child rates.
 * @param rates - The child and linked rates to keep on the contract.
 * @param externalRates - The external rates on the draft. ILOS submissions only.
 * @returns Child rates in update, linked rates in link, and external rates in external. External is undefined when there are none.
 */
function repositionDraftRates(
    contractID: string,
    rates: RateToRepositionType[],
    externalRates: ILOSExternalRateType[] = []
): Pick<RateUpdatesType, 'update' | 'link' | 'external'> {
    // Combine rates and external rates into one array, sorted by position.
    const ordered = [
        ...rates.map((rate) => ({
            position: rate.ratePosition ?? Number.MAX_SAFE_INTEGER,
            rate,
        })),
        ...externalRates.map((externalRate) => ({
            position: externalRate.position,
            externalRate,
        })),
    ].sort((a, b) => a.position - b.position)

    const update: RateUpdatesType['update'] = []
    const link: RateUpdatesType['link'] = []
    const external: ILOSExternalRateType[] = []

    // Renumber positions, this removes the gap a withdrawn rate leaves.
    ordered.forEach((entry, idx) => {
        if ('externalRate' in entry) {
            external.push({ ...entry.externalRate, position: idx + 1 })
        } else if (entry.rate.parentContractID !== contractID) {
            link.push({ rateID: entry.rate.id, ratePosition: idx + 1 })
        } else {
            // Child rates are drafts here, so we use draftRevision to get form data.
            if (!entry.rate.draftRevision) {
                throw new Error(
                    `Draft rate ${entry.rate.id} is missing draft revision`
                )
            }

            update.push({
                rateID: entry.rate.id,
                formData: { ...entry.rate.draftRevision.formData },
                ratePosition: idx + 1,
            })
        }
    })

    return {
        update,
        link,
        external: external.length > 0 ? external : undefined,
    }
}

export { repositionDraftRates }
