import { v4 as uuidv4 } from 'uuid'
import type { InsertRateArgsType } from '../postgres/contractAndRates/insertRate'
import type {
    RateTableFullPayload,
    RateRevisionTableWithContracts,
} from '../postgres/contractAndRates/prismaFullContractRateHelpers'
import type { StateCodeType } from '../common-code/healthPlanFormDataType'
import { findStatePrograms } from '../postgres'
import { must } from './assertionHelpers'
import type { RateFormDataInput } from '../gen/gqlServer'

const defaultRateData = () => ({
    id: '24fb2a5f-6d0d-4e26-9906-4de28927c882',
    createdAt: new Date(),
    updatedAt: new Date(),
    stateCode: 'MN',
    stateNumber: 111,
    withdrawInfo: null,
    withdrawInfoID: null,
})

const mockInsertRateArgs = (
    rateArgs?: Partial<InsertRateArgsType>
): InsertRateArgsType => {
    return {
        stateCode: rateArgs?.stateCode ?? 'MN',
        ...rateArgs,
    }
}

const mockDraftRate = (
    rate?: Partial<RateTableFullPayload>
): RateTableFullPayload => ({
    id: '24fb2a5f-6d0d-4e26-9906-4de28927c882',
    createdAt: new Date(),
    updatedAt: new Date(),
    stateCode: 'MN',
    stateNumber: 111,
    draftContracts: [],
    withdrawInfoID: null,
    withdrawInfo: null,
    revisions: rate?.revisions ?? [
        mockRateRevision(
            rate,
            {
                submitInfo: null,
            },
            rate?.stateCode as StateCodeType
        ) as RateRevisionTableWithContracts,
    ],
    ...rate,
})
const mockRateRevision = (
    rate?: Partial<RateTableFullPayload>,
    revision?: Partial<RateRevisionTableWithContracts>,
    stateCode: StateCodeType = 'MN'
): RateRevisionTableWithContracts => {
    const statePrograms = must(findStatePrograms(stateCode))

    return {
        id: uuidv4(),
        rate: {
            ...defaultRateData(),
            ...rate,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        submitInfo: {
            id: uuidv4(),
            updatedAt: new Date(),
            updatedByID: 'someone',
            updatedReason: 'submit',
            submittedContracts: [],
            updatedBy: {
                id: 'someone',
                createdAt: new Date(),
                updatedAt: new Date(),
                givenName: 'Bob',
                familyName: 'Law',
                email: 'boblaw@example.com',
                role: 'STATE_USER',
                divisionAssignment: null,
                stateCode: stateCode,
            },
        },
        unlockInfo: null,
        submitInfoID: null,
        unlockInfoID: null,
        relatedSubmissions: [],
        rateType: 'NEW',
        rateID: 'rateID',
        rateCertificationName: 'testState-123',
        rateProgramIDs: [statePrograms[0].id],
        deprecatedRateProgramIDs: [statePrograms[0].id],
        rateCapitationType: 'RATE_CELL',
        rateDateStart: new Date(),
        rateDateEnd: new Date(),
        rateDateCertified: new Date(),
        amendmentEffectiveDateEnd: new Date(),
        amendmentEffectiveDateStart: new Date(),
        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
        certifyingActuaryContacts: [],
        addtlActuaryContacts: [],
        supportingDocuments: [
            {
                id: uuidv4(),
                position: 0,
                rateRevisionID: 'rateRevisionID',
                createdAt: new Date(),
                updatedAt: new Date(),
                name: 'rate supporting doc',
                s3URL: 's3://bucketname/key/test1',
                sha256: '2342fwlkdmwvw',
            },
            {
                id: uuidv4(),
                position: 1,
                rateRevisionID: 'rateRevisionID',
                createdAt: new Date(),
                updatedAt: new Date(),
                name: 'rate supporting doc 2',
                s3URL: 's3://bucketname/key/test1',
                sha256: '45662342fwlkdmwvw',
            },
        ],
        rateDocuments: [
            {
                id: uuidv4(),
                position: 0,
                rateRevisionID: 'rateRevisionID',
                createdAt: new Date(),
                updatedAt: new Date(),
                name: 'contract doc',
                s3URL: 's3://bucketname/key/test1',
                sha256: '8984234fwlkdmwvw',
            },
        ],
        contractsWithSharedRateRevision: [],
        ...revision,
    }
}

function mockRateFormDataInput(): RateFormDataInput {
    return {
        rateType: 'AMENDMENT',
        rateCapitationType: 'RATE_CELL',
        rateDateStart: '2024-01-01',
        rateDateEnd: '2025-01-01',
        amendmentEffectiveDateStart: '2024-02-01',
        amendmentEffectiveDateEnd: '2025-02-01',
        rateProgramIDs: ['foo'],
        deprecatedRateProgramIDs: ['foo'],

        rateDocuments: [
            {
                s3URL: 's3://bucketname/key/test1',
                name: 'updatedratedoc1.doc',
                sha256: 'foobar',
            },
        ],
        supportingDocuments: [
            {
                s3URL: 's3://bucketname/key/test1',
                name: 'ratesupdoc1.doc',
                sha256: 'foobar1',
            },
            {
                s3URL: 's3://bucketname/key/test1',
                name: 'ratesupdoc2.doc',
                sha256: 'foobar2',
            },
        ],
        certifyingActuaryContacts: [
            {
                name: 'Foo Person',
                titleRole: 'Bar Job',
                email: 'foo@example.com',
                actuarialFirm: 'GUIDEHOUSE',
            },
        ],
        addtlActuaryContacts: [
            {
                name: 'Bar Person',
                titleRole: 'Baz Job',
                email: 'bar@example.com',
                actuarialFirm: 'OTHER',
                actuarialFirmOther: 'Some Firm',
            },
        ],
        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
    }
}

export {
    mockInsertRateArgs,
    mockRateRevision,
    mockDraftRate,
    mockRateFormDataInput,
}
