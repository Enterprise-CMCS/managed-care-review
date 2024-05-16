import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChangeHistory } from './ChangeHistory'
import { HealthPlanPackage } from '../../gen/gqlClient'

const submissionData: HealthPlanPackage = {
    id: '440d6a53-bb0a-49ae-9a9c-da7c5352789f',
    stateCode: 'MN',
    state: {
        code: 'MN',
        name: 'Minnesota',
        programs: [
            {
                id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                fullName: 'Prepaid Medical Assistance Program',
                name: 'PMAP',
                isRateProgram: false,
            },
        ],
    },
    status: 'RESUBMITTED',
    initiallySubmittedAt: '2022-03-23',
    revisions: [
        {
            node: {
                id: 'sd596de8-852d-4e42-ab0a-c9c9bf78c3c1',
                unlockInfo: {
                    updatedAt: '2022-03-25T01:18:44.663Z',
                    updatedBy: 'zuko@example.com',
                    updatedReason: 'Latest unlock',
                    __typename: 'UpdateInformation',
                },
                submitInfo: {
                    updatedAt: '2022-03-25T01:19:46.154Z',
                    updatedBy: 'aang@example.com',
                    updatedReason: 'Should be latest resubmission',
                    __typename: 'UpdateInformation',
                },
                createdAt: '2022-03-25T01:18:44.665Z',
                formDataProto: 'qpoiuenad',
                __typename: 'HealthPlanRevision',
            },
            __typename: 'HealthPlanRevisionEdge',
        },
        {
            node: {
                id: '26596de8-852d-4e42-bb0a-c9c9bf78c3de',
                unlockInfo: {
                    updatedAt: '2022-03-24T01:18:44.663Z',
                    updatedBy: 'zuko@example.com',
                    updatedReason: 'testing stuff',
                    __typename: 'UpdateInformation',
                },
                submitInfo: {
                    updatedAt: '2022-03-24T01:19:46.154Z',
                    updatedBy: 'aang@example.com',
                    updatedReason: 'Placeholder resubmission reason',
                    __typename: 'UpdateInformation',
                },
                createdAt: '2022-03-24T01:18:44.665Z',
                formDataProto: 'qpoiuenad',
                __typename: 'HealthPlanRevision',
            },
            __typename: 'HealthPlanRevisionEdge',
        },
        {
            node: {
                id: 'e048cdcf-5b19-4acb-8ead-d7dc2fd6cd30',
                unlockInfo: null,
                submitInfo: {
                    updatedAt: '2022-03-23T02:08:52.259Z',
                    updatedBy: 'aang@example.com',
                    updatedReason: 'Initial submission',
                    __typename: 'UpdateInformation',
                },
                createdAt: '2022-03-23T02:08:14.241Z',
                formDataProto: 'nmzxcv;lasf',
                __typename: 'HealthPlanRevision',
            },
            __typename: 'HealthPlanRevisionEdge',
        },
    ],
    __typename: 'HealthPlanPackage',
}

const formDataProtoInitialSubmission: HealthPlanPackage = {
    id: '440d6a53-bb0a-49ae-9a9c-da7c5352789f',
    stateCode: 'MN',
    state: {
        name: 'Minnesota',
        code: 'MN',
        programs: [],
    },
    status: 'RESUBMITTED',
    initiallySubmittedAt: '2022-03-23',
    revisions: [
        {
            node: {
                id: 'e048cdcf-5b19-4acb-8ead-d7dc2fd6cd30',
                unlockInfo: null,
                submitInfo: {
                    updatedAt: '2022-03-23T02:08:52.259Z',
                    updatedBy: 'aang@example.com',
                    updatedReason: 'Initial submission',
                    __typename: 'UpdateInformation',
                },
                createdAt: '2022-03-23T02:08:14.241Z',
                formDataProto: 'nmzxcv;lasf',
                __typename: 'HealthPlanRevision',
            },
            __typename: 'HealthPlanRevisionEdge',
        },
    ],
    __typename: 'HealthPlanPackage',
}

const formDataProtoInitialSubmissionUnlocked: HealthPlanPackage = {
    id: '440d6a53-bb0a-49ae-9a9c-da7c5352789f',
    stateCode: 'MN',
    state: {
        name: 'Minnesota',
        code: 'MN',
        programs: [],
    },
    status: 'RESUBMITTED',
    initiallySubmittedAt: '2022-03-23',
    revisions: [
        {
            node: {
                id: 'e048cdcf-5b19-4acb-8ead-d7dc2fd6cd30',
                unlockInfo: {
                    updatedAt: '2022-03-25T01:18:44.663Z',
                    updatedBy: 'zuko@example.com',
                    updatedReason: 'testing stuff',
                    __typename: 'UpdateInformation',
                },
                submitInfo: null,
                createdAt: '2022-03-23T02:08:14.241Z',
                formDataProto: 'nmzxcv;lasf',
                __typename: 'HealthPlanRevision',
            },
            __typename: 'HealthPlanRevisionEdge',
        },
        {
            node: {
                id: 'e048cdcf-5b19-4acb-8ead-d7dc2fd6cd30',
                unlockInfo: null,
                submitInfo: {
                    updatedAt: '2022-03-23T02:08:52.259Z',
                    updatedBy: 'aang@example.com',
                    updatedReason: 'Initial submission',
                    __typename: 'UpdateInformation',
                },
                createdAt: '2022-03-23T02:08:14.241Z',
                formDataProto: 'nmzxcv;lasf',
                __typename: 'HealthPlanRevision',
            },
            __typename: 'HealthPlanRevisionEdge',
        },
    ],
    __typename: 'HealthPlanPackage',
}

describe('Change History', () => {
    it('renders without errors', () => {
        render(<ChangeHistory submission={submissionData} />)
        expect(screen.getByText('Change history')).toBeInTheDocument()
    })

    it('includes an accordion list of changes', () => {
        render(<ChangeHistory submission={submissionData} />)
        expect(screen.getByTestId('accordion')).toBeInTheDocument()
    })

    it('has expected text in the accordion title', () => {
        render(<ChangeHistory submission={submissionData} />)
        expect(
            screen.getByRole('button', {
                name: '03/23/22 9:19pm ET - Submission',
            })
        ).toBeInTheDocument()
    })

    it('has expected text in the accordion content', () => {
        render(<ChangeHistory submission={submissionData} />)
        expect(
            screen.getByText('Placeholder resubmission reason')
        ).toBeInTheDocument()
    })

    it('should expand and collapse the accordion on click', async () => {
        render(<ChangeHistory submission={submissionData} />)
        expect(
            screen.getByText('Placeholder resubmission reason')
        ).not.toBeVisible()
        const accordionRows = screen.getAllByRole('button')
        await userEvent.click(accordionRows[0])
        expect(screen.getByText('Should be latest resubmission')).toBeVisible()
        await userEvent.click(accordionRows[0])
        expect(
            screen.getByText('Should be latest resubmission')
        ).not.toBeVisible()
    })
    it('should list the submission events in reverse chronological order', () => {
        render(<ChangeHistory submission={submissionData} />)
        expect(
            screen.getByText('Placeholder resubmission reason')
        ).not.toBeVisible()
        const accordionRows = screen.getAllByRole('button')
        expect(accordionRows[0]).toHaveTextContent(
            '03/24/22 9:19pm ET - Submission'
        )
        expect(accordionRows[1]).toHaveTextContent(
            '03/24/22 9:18pm ET - Unlock'
        )
        expect(accordionRows[2]).toHaveTextContent(
            '03/23/22 9:19pm ET - Submission'
        )
        expect(accordionRows[3]).toHaveTextContent(
            '03/23/22 9:18pm ET - Unlock'
        )
        expect(accordionRows[4]).toHaveTextContent(
            '03/22/22 10:08pm ET - Submission'
        )
    })
    it('has correct href values for previous submission links', () => {
        render(<ChangeHistory submission={submissionData} />)
        expect(screen.getByTestId(`revision-link-1`)).toHaveAttribute(
            'href',
            `/submissions/440d6a53-bb0a-49ae-9a9c-da7c5352789f/revisions/1`
        )
        expect(screen.getByTestId(`revision-link-2`)).toHaveAttribute(
            'href',
            `/submissions/440d6a53-bb0a-49ae-9a9c-da7c5352789f/revisions/2`
        )
    })
    it('should list accordion items with links when appropriate', () => {
        render(<ChangeHistory submission={submissionData} />)
        //Latest resubmission should not have a link.
        expect(
            screen.getByTestId('accordionItem_2022-03-25T01:19:46.154Z')
        ).not.toHaveTextContent('View past submission version')
        //Unlock history accordion should not have a link
        expect(
            screen.getByTestId('accordionItem_2022-03-25T01:18:44.663Z')
        ).not.toHaveTextContent('View past submission version')
        //Previous submission should contain a link
        expect(
            screen.getByTestId('accordionItem_2022-03-24T01:19:46.154Z')
        ).toHaveTextContent('View past submission version')
        //Unlock history accordion should not have a link
        expect(
            screen.getByTestId('accordionItem_2022-03-24T01:18:44.663Z')
        ).not.toHaveTextContent('View past submission version')
        //Previous submission should contain a link
        expect(
            screen.getByTestId('accordionItem_2022-03-23T02:08:52.259Z')
        ).toHaveTextContent('View past submission version')
    })
    it('should not list links for initial submission without revisions', () => {
        render(<ChangeHistory submission={formDataProtoInitialSubmission} />)
        //Initial submission should not have a link
        expect(
            screen.getByTestId('accordionItem_2022-03-23T02:08:52.259Z')
        ).not.toHaveTextContent('View past submission version')
    })
    it('should not list links for initial submission when initial submission is unlocked', () => {
        render(
            <ChangeHistory
                submission={formDataProtoInitialSubmissionUnlocked}
            />
        )
        //Initial submission should not have a link
        expect(
            screen.getByTestId('accordionItem_2022-03-23T02:08:52.259Z')
        ).not.toHaveTextContent('View past submission version')
    })
})
