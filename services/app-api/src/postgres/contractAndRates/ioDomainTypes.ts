import * as t from 'io-ts'
import { DateFromISOString } from 'io-ts-types/lib/DateFromISOString'

const IORateAmendmentFormData = t.type({
    rateType: t.literal('AMENDMENT'),
    amendmentDateStart: t.string,
    amendmentDateEnd: t.string,
})

const IONewRateAmendmentFormDataV0 = t.type({
    rateType: t.literal('NEW'),
})


const IORateFormDataName = t.type({
    schemaName: t.literal('rateFormData'),
})


const IOBaseRateFormData = t.intersection([IORateFormDataName, 
    t.type({
        schemaVersion: t.number,

        rateCapitationType: t.union([t.literal('RATE_CELL'), t.literal('RATE_RANGE')]),
        rateDateStart: t.string,
        rateDateEnd: t.string,
    }
)])

const IOBaseRateFormDataV0 = t.intersection([IOBaseRateFormData, t.type({ schemaVersion: t.literal(0)})])

const IORateFormDataV0 = t.intersection([IOBaseRateFormDataV0, t.union([IORateAmendmentFormData, IONewRateAmendmentFormDataV0])])
type IORateFormDataTypeV0 = t.TypeOf<typeof IORateFormDataV0>


const IONewRateAmendmentFormDataV1 = t.intersection([IONewRateAmendmentFormDataV0, t.type({
    exactStartDate: DateFromISOString
})])

// declare function omit<O, K extends keyof O>(o: O, k: K): Omit<O, K>

// const versionlessBaseRateFormData = omit(IOBaseRateFormData, 'schemaVersion')

const IOBaseRateFormDataV1 = t.intersection([IOBaseRateFormData, t.type({ schemaVersion: t.literal(1)})])

const IORateFormDataV1 = t.intersection(
    [
        IOBaseRateFormDataV1,
        t.union(
            [
                IORateAmendmentFormData, 
                IONewRateAmendmentFormDataV1
            ]
        )
    ]
)

type IORateFormDataTypeV1 = t.TypeOf<typeof IORateFormDataV1>



export type {
    IORateFormDataTypeV0,
    IORateFormDataTypeV1,
}

export {
    IORateFormDataV0,
    IORateFormDataV1,
}
