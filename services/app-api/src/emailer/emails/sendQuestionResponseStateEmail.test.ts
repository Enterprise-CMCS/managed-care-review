import {
    testEmailConfig,
    mockContractRev,
    mockMNState,
} from '../../testHelpers/emailerHelpers'
import type {
    CMSUserType,
    ContractRevisionType,
    StateType,
} from '../../domain-models'
import type { ContractFormDataType, Question } from '../../domain-models'
import { packageName } from '@mc-review/hpp'
import { sendQuestionResponseStateEmail } from './index'

const defaultSubmitters = ['submitter1@example.com', 'submitter2@example.com']

const flState: StateType = {
    stateCode: 'FL',
    name: 'Florida',
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

const questions: Question[] = [
    {
        id: '1234',
        contractID: 'contract-id-test',
        createdAt: new Date('01/01/2024'),
        addedBy: cmsUser,
        documents: [],
        division: 'DMCO',
        responses: [],
    },
]

const currentQuestion = questions[0]

const formData: ContractFormDataType = {
    programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
    populationCovered: 'CHIP',
    submissionType: 'CONTRACT_AND_RATES',
    riskBasedContract: false,
    submissionDescription: 'A submitted submission',
    supportingDocuments: [
        {
            s3URL: 's3://bucketname/key/test1',
            name: 'foo',
            sha256: 'fakesha',
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
    const template = await sendQuestionResponseStateEmail(
        sub,
        testEmailConfig(),
        defaultSubmitters,
        defaultStatePrograms,
        questions,
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
    const template = await sendQuestionResponseStateEmail(
        sub,
        testEmailConfig(),
        defaultSubmitters,
        defaultStatePrograms,
        questions,
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
    const template = await sendQuestionResponseStateEmail(
        sub,
        testEmailConfig(),
        defaultSubmitters,
        defaultStatePrograms,
        questions,
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

test('subject line is correct and clearly states submission was successful', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs
    const name = packageName(
        sub.contract.stateCode,
        sub.contract.stateNumber,
        sub.formData.programIDs,
        defaultStatePrograms
    )

    const template = await sendQuestionResponseStateEmail(
        sub,
        testEmailConfig(),
        defaultSubmitters,
        defaultStatePrograms,
        questions,
        currentQuestion
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(
                `Response submitted to CMS for ${name}`
            ),
        })
    )
})

test('includes link to submission', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs
    const template = await sendQuestionResponseStateEmail(
        sub,
        testEmailConfig(),
        defaultSubmitters,
        defaultStatePrograms,
        questions,
        currentQuestion
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining('View response'),
            bodyHTML: expect.stringContaining(
                `http://localhost/submissions/${sub.contract.id}/question-and-answer`
            ),
        })
    )
})

test('includes information about what to do next', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs
    const template = await sendQuestionResponseStateEmail(
        sub,
        testEmailConfig(),
        defaultSubmitters,
        defaultStatePrograms,
        questions,
        currentQuestion
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Questions: You may receive additional questions from CMS as they conduct their reviews.'
            ),
        })
    )
})

test('includes expected data', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs

    const template = await sendQuestionResponseStateEmail(
        sub,
        testEmailConfig(),
        defaultSubmitters,
        defaultStatePrograms,
        questions,
        currentQuestion
    )

    if (template instanceof Error) {
        throw template
    }

    // Includes correct division the response was sent to
    // Includes the correct round number for the response
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'DMCO round 1 response was successfully submitted'
            ),
        })
    )
    // Includes correct date response was submitted
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining('Date: 01/01/2024'),
        })
    )
})

test('renders overall email for a new response as expected', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs
    const result = await sendQuestionResponseStateEmail(
        sub,
        testEmailConfig(),
        defaultSubmitters,
        defaultStatePrograms,
        questions,
        currentQuestion
    )

    if (result instanceof Error) {
        console.error(result)
        return
    }

    expect(result.bodyHTML).toMatchSnapshot()
})
