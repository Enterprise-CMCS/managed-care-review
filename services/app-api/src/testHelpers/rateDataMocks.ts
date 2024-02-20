import { v4 as uuidv4 } from 'uuid'
import type { InsertRateArgsType } from '../postgres/contractAndRates/insertRate'
import type {
    RateTableFullPayload,
    RateRevisionTableWithContracts,
} from '../postgres/contractAndRates/prismaSubmittedRateHelpers'
import type { StateCodeType } from 'app-web/src/common-code/healthPlanFormDataType'
import { findStatePrograms } from '../postgres'
import { must } from './assertionHelpers'

const defaultRateData = () => ({
    id: '24fb2a5f-6d0d-4e26-9906-4de28927c882',
    createdAt: new Date(),
    updatedAt: new Date(),
    stateCode: 'MN',
    stateNumber: 111,
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
    revisions: rate?.revisions ?? [
        mockRateRevision(
            rate,
            {
                contractRevisions: [],
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
        rateType: 'NEW',
        rateID: 'rateID',
        rateCertificationName: 'testState-123',
        rateProgramIDs: [statePrograms[0].id],
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
                s3URL: 'fakeS3URL',
                sha256: '2342fwlkdmwvw',
            },
            {
                id: uuidv4(),
                position: 1,
                rateRevisionID: 'rateRevisionID',
                createdAt: new Date(),
                updatedAt: new Date(),
                name: 'rate supporting doc 2',
                s3URL: 'fakeS3URL',
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
                s3URL: 'fakeS3URL',
                sha256: '8984234fwlkdmwvw',
            },
        ],
        contractRevisions: [],
        draftContracts: [],
        contractsWithSharedRateRevision: [],
        ...revision,
    }
}

export { mockInsertRateArgs, mockRateRevision, mockDraftRate }