import React from 'react'
import { screen, render } from '@testing-library/react'
import {
    SubmissionCard,
    SubmissionStatus,
    SubmissionType,
} from './SubmissionCard'

describe('SubmissionCard', () => {
    const contractOnlyDraftSubmission = {
        name: 'VA-CCCPlus-0001',
        description:
            'Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly.',
        submissionType: SubmissionType.ContractOnly,
        status: SubmissionStatus.draft,
    }

    it('renders without errors', () => {
        render(<SubmissionCard {...contractOnlyDraftSubmission} />)
        expect(screen.getByRole('listitem')).toBeInTheDocument()
    })

    it('displays draft tag styling when submission type is draft', () => {
        render(<SubmissionCard {...contractOnlyDraftSubmission} />)
        expect(screen.getByTestId('tag')).toBeInTheDocument()

        expect(screen.getByTestId('tag')).toHaveStyle(`
            background-color: '#e4a61b',
        `)
    })

    it('displays submitted tag styling when submission type is submitted', () => {
        render(
            <SubmissionCard
                name="VA-CCCPlus-0001"
                description="Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly."
                submissionType={SubmissionType.ContractOnly}
                status={SubmissionStatus.submitted}
            />
        )
        expect(screen.getByTestId('tag')).toBeInTheDocument()

        expect(screen.getByTestId('tag')).toHaveStyle(`
            background-color: '#2e8540',
        `)
    })

    it('displays draft tag text when submission type is draft', () => {
        render(<SubmissionCard {...contractOnlyDraftSubmission} />)
        expect(screen.getByText('Draft')).toBeInTheDocument()
    })

    it('displays submitted tag text when submission type is submitted', () => {
        render(
            <SubmissionCard
                name="VA-CCCPlus-0001"
                description="Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly."
                submissionType={SubmissionType.ContractOnly}
                status={SubmissionStatus.submitted}
                date={Date.now()}
            />
        )
        expect(screen.getByText(/Submitted/i)).toBeInTheDocument()
    })

    it('displays submission name as a link', () => {
        render(<SubmissionCard {...contractOnlyDraftSubmission} />)
        expect(
            screen.getByRole('link', { name: 'VA-CCCPlus-0001' })
        ).toBeInTheDocument()
    })

    it('displays submission description', () => {
        render(<SubmissionCard {...contractOnlyDraftSubmission} />)
        expect(
            screen.getByText(
                'Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly.'
            )
        ).toBeInTheDocument()
    })

    it('displays appropriate contract type text for contract only submission', () => {
        render(<SubmissionCard {...contractOnlyDraftSubmission} />)
        expect(screen.getByText('Contract only')).toBeInTheDocument()
    })

    it('displays appropriate contract type text for contract and rate certification submission', () => {
        render(
            <SubmissionCard
                {...contractOnlyDraftSubmission}
                submissionType={SubmissionType.ContractAndRates}
            />
        )
        expect(
            screen.getByText('Contract and rate certification')
        ).toBeInTheDocument()
    })
})
