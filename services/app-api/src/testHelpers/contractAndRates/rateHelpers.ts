import { State } from '@prisma/client'
import { must } from '../errorHelpers'
import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { InsertRateArgsType } from '../../postgres/contractAndRates/insertRate'
import {
    DraftRateRevisionTableWithRelations,
    DraftRateTableWithRelations,
} from '../../postgres/contractAndRates/prismaDraftContractHelpers'
import { RateRevisionTableWithContracts, RateTableWithRelations } from '../../postgres/contractAndRates/prismaSubmittedRateHelpers'

const createInsertRateData = (
    rateArgs?: Partial<InsertRateArgsType>
): InsertRateArgsType => {
    return {
        stateCode: rateArgs?.stateCode ?? 'MN',
        ...rateArgs
    }
}

const getStateRecord = async (
    client: PrismaClient,
    stateCode: string
): Promise<State> => {
    const state = must(
        await client.state.findFirst({
            where: {
                stateCode,
            },
        })
    )

    if (!state) {
        throw new Error('Unexpected prisma error: state record not found')
    }

    return state
}

const createDraftRateData = (
    rate?: Partial<DraftRateTableWithRelations>
): DraftRateTableWithRelations => ({
    id: '24fb2a5f-6d0d-4e26-9906-4de28927c882',
    createdAt: new Date(),
    updatedAt: new Date(),
    stateCode: 'FL',
    stateNumber: 111,
    revisions: rate?.revisions ?? [
        createRateRevision({
            contractRevisions: undefined,
            submitInfo: null,
        }) as DraftRateRevisionTableWithRelations,
    ],
    ...rate,
})

const createRateData = (
    rate?: Partial<RateTableWithRelations>
): RateTableWithRelations => ({
    id: '24fb2a5f-6d0d-4e26-9906-4de28927c882',
    createdAt: new Date(),
    updatedAt: new Date(),
    stateCode: 'FL',
    stateNumber: 111,
    revisions: rate?.revisions ?? [
        createRateRevision({
            draftContracts: undefined,
        }) as RateRevisionTableWithContracts,
    ],
    ...rate,
})

const createRateRevision = (
    revision?: Partial<
    RateRevisionTableWithContracts  | DraftRateRevisionTableWithRelations
    >
):
    | RateRevisionTableWithContracts
    | DraftRateRevisionTableWithRelations => ({
    id: uuidv4(),
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
            stateCode: 'OH',
        },
    },
    unlockInfo: null,
    submitInfoID: null,
    unlockInfoID: null,
    rateType: 'NEW',
    rateID:  'rateID',
    rateCertificationName: 'testState-123',
    rateProgramIDs: ['Program'],
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
            rateRevisionID: 'rateRevisionID',
            createdAt: new Date(),
            updatedAt: new Date(),
            name: 'rate supporting doc',
            s3URL: 'fakeS3URL',
            sha256: '2342fwlkdmwvw',
        },
        {
            id: uuidv4(),
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
    ...revision,
})

export {
    createInsertRateData,
    getStateRecord,
    createRateRevision,
    createRateData,
    createDraftRateData,
}
