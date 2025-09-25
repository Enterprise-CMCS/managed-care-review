import {
    testEmailConfig,
    mockContractRev,
    mockMNState,
} from '../../testHelpers/emailerHelpers'
import type {
    CMSUserType,
    ContractRevisionType,
    StateType,
    ContractFormDataType,
    ContractQuestionType,
} from '../../domain-models'
import { packageName } from '@mc-review/hpp'
import { sendQuestionStateEmail } from './index'

const defaultSubmitters = ['submitter1@example.com', 'submitter2@example.com']

const flState: StateType = {
    stateCode: 'FL',
    name: 'Florida',
    assignedCMSUsers: [],
}

const cmsUser: CMSUserType = {
    id: '1234',
    role: 'CMS_USER',
    divisionAssignment: 'DMCO',
    familyName: 'McDonald',
    givenName: 'Ronald',
    email: 'cms@email.com',
    stateAssignments: [flState],
}

const currentQuestion: ContractQuestionType = {
    id: '1234',
    contractID: 'contract-id-test',
    createdAt: new Date('01/01/2024'),
    addedBy: cmsUser,
    documents: [],
    division: 'DMCO',
    responses: [],
}

const formData: ContractFormDataType = {
    programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
    populationCovered: 'CHIP',
    submissionType: 'CONTRACT_AND_RATES',
    riskBasedContract: false,
    dsnpContract: false,
    submissionDescription: 'A submitted submission',
    supportingDocuments: [
        {
            s3URL: 's3://bucketname/key/test1',
            name: 'foo',
            sha256: 'fakesha',
            dateAdded: new Date(),
        },
    ],
    contractType: 'BASE',
    contractExecutionStatus: undefined,
    contractDocuments: [
        {
            s3URL: 's3://bucketname/key/test1',
            name: 'foo',
            sha256: 'fakesha',
        },
    ],
    contractDateStart: new Date('01/01/2024'),
    contractDateEnd: new Date('01/01/2025'),
    managedCareEntities: ['MCO'],
    federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
    inLieuServicesAndSettings: undefined,
    modifiedBenefitsProvided: undefined,
    modifiedGeoAreaServed: undefined,
    modifiedMedicaidBeneficiaries: undefined,
    modifiedRiskSharingStrategy: undefined,
    modifiedIncentiveArrangements: undefined,
    modifiedWitholdAgreements: undefined,
    modifiedStateDirectedPayments: undefined,
    modifiedPassThroughPayments: undefined,
    modifiedPaymentsForMentalDiseaseInstitutions: undefined,
    modifiedMedicalLossRatioStandards: undefined,
    modifiedOtherFinancialPaymentIncentive: undefined,
    modifiedEnrollmentProcess: undefined,
    modifiedGrevienceAndAppeal: undefined,
    modifiedNetworkAdequacyStandards: undefined,
    modifiedLengthOfContract: undefined,
    modifiedNonRiskPaymentArrangements: undefined,
    statutoryRegulatoryAttestation: undefined,
    statutoryRegulatoryAttestationDescription: undefined,
    stateContacts: [
        {
            name: 'test1',
            titleRole: 'Foo1',
            email: 'test1@example.com',
        },
        {
            name: 'test2',
            titleRole: 'Foo2',
            email: 'test2@example.com',
        },
    ],
}

test('to addresses list includes submitter emails', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs
    const template = await sendQuestionStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms,
        currentQuestion
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            toAddresses: expect.arrayContaining(defaultSubmitters),
        })
    )
})

test('to addresses list includes all state contacts on submission', async () => {
    const sub: ContractRevisionType = {
        ...mockContractRev({ formData }),
    }
    const defaultStatePrograms = mockMNState().programs
    const template = await sendQuestionStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms,
        currentQuestion
    )

    if (template instanceof Error) {
        throw template
    }

    sub.formData.stateContacts.forEach((contact) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([contact.email]),
            })
        )
    })
})

test('to addresses list does not include duplicate state receiver emails on submission', async () => {
    const formDataWithDuplicateStateContacts = {
        ...formData,
        stateContacts: [
            {
                name: 'test1',
                titleRole: 'Foo1',
                email: 'test1@example.com',
            },
            {
                name: 'test1',
                titleRole: 'Foo1',
                email: 'test1@example.com',
            },
        ],
    }

    const sub: ContractRevisionType = mockContractRev({
        formData: formDataWithDuplicateStateContacts,
    })
    const defaultStatePrograms = mockMNState().programs
    const template = await sendQuestionStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms,
        currentQuestion
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template.toAddresses).toEqual([
        'test1@example.com',
        ...defaultSubmitters,
        ...testEmailConfig().devReviewTeamEmails,
    ])
})

test('subject line is correct and clearly states submission is complete', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs
    const name = packageName(
        sub.contract.stateCode,
        sub.contract.stateNumber,
        sub.formData.programIDs,
        defaultStatePrograms
    )

    const template = await sendQuestionStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms,
        currentQuestion
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(`New questions about ${name}`),
            bodyText: expect.stringContaining(`${name}`),
        })
    )
})

test('includes link to submission', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs
    const template = await sendQuestionStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms,
        currentQuestion
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Open the submission in MC-Review to answer question'
            ),
            bodyHTML: expect.stringContaining(
                `http://localhost/submissions/${sub.contract.id}/question-and-answer`
            ),
        })
    )
})

test('includes information about what to do next', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs
    const template = await sendQuestionStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms,
        currentQuestion
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'You must respond to the questions before CMS can continue their review.'
            ),
        })
    )
})

test('includes expected data on the CMS analyst who sent the question', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs

    const template = await sendQuestionStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms,
        currentQuestion
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Sent by: Ronald McDonald (DMCO)  cms@email.com (cms@email.com)'
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining('Date: 12/31/2023'),
        })
    )
})

test('renders overall email for a new question as expected', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs
    const result = await sendQuestionStateEmail(
        sub,
        defaultSubmitters,
        testEmailConfig(),
        defaultStatePrograms,
        currentQuestion
    )

    if (result instanceof Error) {
        console.error(result)
        return
    }

    expect(result.bodyHTML).toMatchSnapshot()
})
