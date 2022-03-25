import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChangeHistory } from './ChangeHistory'
import { Submission2 } from '../../gen/gqlClient'

const submissionData: Submission2 = {
    id: '440d6a53-bb0a-49ae-9a9c-da7c5352789f',
    stateCode: 'MN',
    status: 'RESUBMITTED',
    intiallySubmittedAt: '2022-03-23',
    revisions: [
        {
            revision: {
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
                submissionData: 'qpoiuenad',
                __typename: 'Revision',
            },
            __typename: 'RevisionEdge',
        },
        {
            revision: {
                id: 'e048cdcf-5b19-4acb-8ead-d7dc2fd6cd30',
                unlockInfo: null,
                submitInfo: {
                    updatedAt: '2022-03-23T02:08:52.259Z',
                    updatedBy: 'aang@example.com',
                    updatedReason: 'Initial submission',
                    __typename: 'UpdateInformation',
                },
                createdAt: '2022-03-23T02:08:14.241Z',
                submissionData: 'nmzxcv;lasf',
                __typename: 'Revision',
            },
            __typename: 'RevisionEdge',
        },
    ],
    __typename: 'Submission2',
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

    it('should expand and collapse the accordion on click', () => {
        render(<ChangeHistory submission={submissionData} />)
        expect(
            screen.getByText('Placeholder resubmission reason')
        ).not.toBeVisible()
        const accordionRows = screen.getAllByRole('button')
        userEvent.click(accordionRows[0])
        expect(
            screen.getByText('Placeholder resubmission reason')
        ).toBeVisible()
        userEvent.click(accordionRows[0])
        expect(
            screen.getByText('Placeholder resubmission reason')
        ).not.toBeVisible()
    })
    it('should list the submission events in reverse chronological order', () => {
        render(<ChangeHistory submission={submissionData} />)
        expect(
            screen.getByText('Placeholder resubmission reason')
        ).not.toBeVisible()
        const accordionRows = screen.getAllByRole('button')
        expect(accordionRows[0]).toHaveTextContent(
            '03/23/22 9:19pm ET - Submission'
        )
        expect(accordionRows[1]).toHaveTextContent(
            '03/23/22 9:18pm ET - Unlock'
        )
        expect(accordionRows[2]).toHaveTextContent(
            '03/22/22 10:08pm ET - Submission'
        )
    })
})
