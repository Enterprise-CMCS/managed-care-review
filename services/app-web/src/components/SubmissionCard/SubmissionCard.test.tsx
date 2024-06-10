import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import dayjs from 'dayjs'
import {
    SubmissionCard,
    SubmissionStatus,
    SubmissionType,
} from './SubmissionCard'
import { renderWithProviders } from '../../testHelpers/jestHelpers'

describe('SubmissionCard', () => {
    const contractOnlyDraftSubmission = {
        name: 'VA-CCCPlus-0001',
        description:
            'Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly.',
        submissionType: SubmissionType.ContractOnly,
        status: SubmissionStatus.draft,
        href: '/foo',
    }

    it('renders without errors', () => {
        renderWithProviders(<SubmissionCard {...contractOnlyDraftSubmission} />)
        expect(screen.getByRole('listitem')).toBeInTheDocument()
    })

    it('displays draft tag styling when submission type is draft', async () => {
        renderWithProviders(<SubmissionCard {...contractOnlyDraftSubmission} />)

        await waitFor(() => {
            expect(screen.getByTestId('tag')).toBeInTheDocument()
            expect(screen.getByTestId('tag')).toHaveTextContent('Draft')
            expect(screen.getByTestId('tag')).toHaveClass(/tagWarning/)
        })
    })

    it('displays submitted tag styling when submission type is submitted', () => {
        renderWithProviders(
            <SubmissionCard
                name="VA-CCCPlus-0001"
                description="Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly."
                submissionType={SubmissionType.ContractOnly}
                status={SubmissionStatus.submitted}
                href="/foo"
            />
        )
        expect(screen.getByTestId('tag')).toBeInTheDocument()

        expect(screen.getByTestId('tag')).toHaveStyle(`
            background-color: '#2e8540',
        `)
    })

    it('displays draft tag text when submission type is draft', () => {
        renderWithProviders(<SubmissionCard {...contractOnlyDraftSubmission} />)
        expect(screen.getByText('Draft')).toBeInTheDocument()
    })

    it('displays submitted tag text when submission type is submitted', () => {
        renderWithProviders(
            <SubmissionCard
                name="VA-CCCPlus-0001"
                description="Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly."
                submissionType={SubmissionType.ContractOnly}
                status={SubmissionStatus.submitted}
                date={dayjs()}
                href="/foo"
            />
        )
        expect(screen.getByText(/Submitted/i)).toBeInTheDocument()
    })

    it('displays submission name as a link', () => {
        renderWithProviders(<SubmissionCard {...contractOnlyDraftSubmission} />)
        expect(
            screen.getByRole('link', { name: 'VA-CCCPlus-0001' })
        ).toBeInTheDocument()
    })

    it('displays submission description', () => {
        renderWithProviders(<SubmissionCard {...contractOnlyDraftSubmission} />)
        expect(
            screen.getByText(
                'Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly.'
            )
        ).toBeInTheDocument()
    })

    it('displays appropriate contract type text for contract only submission', () => {
        renderWithProviders(<SubmissionCard {...contractOnlyDraftSubmission} />)
        expect(screen.getByText('Contract only')).toBeInTheDocument()
    })

    it('displays appropriate contract type text for contract and rate certification submission', () => {
        renderWithProviders(
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
