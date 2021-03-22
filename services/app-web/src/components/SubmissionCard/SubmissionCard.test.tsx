import React from 'react'
import { screen, render } from '@testing-library/react'
import {
    SubmissionCard,
    SubmissionStatus,
    SubmissionType,
} from './SubmissionCard'

describe('SubmissionCard', () => {
    const testProps = {
        name: 'VA-CCCPlus-0001',
        description:
            'Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly.',
        submissionType: SubmissionType.ContractOnly,
        status: SubmissionStatus.draft,
    }

    it('renders without errors', () => {
        render(<SubmissionCard {...testProps} />)
        expect(screen.getByRole('listitem')).toBeInTheDocument()
    })

    it.todo('displays tag styling based on submission type')
    it.todo('displays tag text submission type')
    it.todo('displays submission name as a link')
    it.todo('displays submission description')
    it.todo('displays contract type')
})
