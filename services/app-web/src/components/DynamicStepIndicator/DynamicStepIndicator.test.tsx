import { screen, render } from '@testing-library/react'
import { DynamicStepIndicator } from './DynamicStepIndicator'

import {
    STATE_SUBMISSION_FORM_ROUTES,
    EQRO_SUBMISSION_FORM_ROUTES,
} from '@mc-review/constants'
import { activeFormPages } from '../../pages/StateSubmission'
import { mockContractFormData } from '@mc-review/mocks'

describe('DynamicStepIndicator', () => {
    it('renders without errors', () => {
        render(
            <DynamicStepIndicator
                formPages={STATE_SUBMISSION_FORM_ROUTES}
                currentFormPage={STATE_SUBMISSION_FORM_ROUTES[2]}
            />
        )
        expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
        const steps = screen.getAllByRole('listitem')

        expect(steps).toHaveLength(STATE_SUBMISSION_FORM_ROUTES.length)

        expect(steps[1]).toHaveClass('usa-step-indicator__segment--complete')
        expect(steps[2]).toHaveClass('usa-step-indicator__segment--current')
        expect(steps[3]).toHaveClass('usa-step-indicator__segment', {
            exact: true,
        })
    })

    it('displays nothing when the current form page is passed an unknown route', () => {
        render(
            <div data-testid="container">
                <DynamicStepIndicator
                    formPages={STATE_SUBMISSION_FORM_ROUTES}
                    currentFormPage={'UNKNOWN_ROUTE'}
                />
            </div>
        )

        expect(screen.getByTestId('container')).toBeEmptyDOMElement()
    })

    it('renders the rate details step for contract and rates submissions', () => {
        const contract = mockContractFormData()
        render(
            <DynamicStepIndicator
                formPages={activeFormPages(contract)}
                currentFormPage={STATE_SUBMISSION_FORM_ROUTES[5]}
            />
        )

        expect(screen.getByText('Rate details')).toBeInTheDocument()
    })

    it('does not render the rate details step for contract only submissions', () => {
        const contract = mockContractFormData({
            submissionType: 'CONTRACT_ONLY',
        })
        render(
            <DynamicStepIndicator
                formPages={activeFormPages(contract)}
                currentFormPage={STATE_SUBMISSION_FORM_ROUTES[5]}
            />
        )

        expect(screen.queryByText('Rate details')).not.toBeInTheDocument()
    })

    describe('EQRO submissions', () => {
        it('renders the correct number of steps for EQRO submissions', () => {
            render(
                <DynamicStepIndicator
                    formPages={EQRO_SUBMISSION_FORM_ROUTES}
                    currentFormPage={EQRO_SUBMISSION_FORM_ROUTES[0]}
                />
            )

            const steps = screen.getAllByRole('listitem')
            expect(steps).toHaveLength(4)
        })

        it('renders custom page title for EQRO submission type page', () => {
            render(
                <DynamicStepIndicator
                    formPages={EQRO_SUBMISSION_FORM_ROUTES}
                    currentFormPage={EQRO_SUBMISSION_FORM_ROUTES[0]}
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                    }}
                />
            )

            const submissionDetailsLabels =
                screen.getAllByText('Submission details')
            expect(submissionDetailsLabels).toHaveLength(2)
            expect(
                screen.queryByText('Submission type')
            ).not.toBeInTheDocument()
        })

        it('uses default title when custom title is not provided', () => {
            render(
                <DynamicStepIndicator
                    formPages={EQRO_SUBMISSION_FORM_ROUTES}
                    currentFormPage={EQRO_SUBMISSION_FORM_ROUTES[0]}
                />
            )

            const submissionTypeLabels = screen.getAllByText('Submission type')
            expect(submissionTypeLabels).toHaveLength(2)
            expect(
                screen.queryByText('Submission details')
            ).not.toBeInTheDocument()
        })

        it('does not render rate details step for EQRO submissions', () => {
            render(
                <DynamicStepIndicator
                    formPages={EQRO_SUBMISSION_FORM_ROUTES}
                    currentFormPage={EQRO_SUBMISSION_FORM_ROUTES[0]}
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                    }}
                />
            )

            expect(screen.queryByText('Rate details')).not.toBeInTheDocument()
        })

        it('does not render Supporting documents step for EQRO submissions', () => {
            render(
                <DynamicStepIndicator
                    formPages={EQRO_SUBMISSION_FORM_ROUTES}
                    currentFormPage={EQRO_SUBMISSION_FORM_ROUTES[0]}
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                    }}
                />
            )

            expect(
                screen.queryByText('Supporting documents')
            ).not.toBeInTheDocument()
        })

        it('renders all EQRO steps with correct labels', () => {
            render(
                <DynamicStepIndicator
                    formPages={EQRO_SUBMISSION_FORM_ROUTES}
                    currentFormPage={EQRO_SUBMISSION_FORM_ROUTES[1]} // Contract details is the current page
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                    }}
                />
            )
            const contractDetailsLabels =
                screen.getAllByText('Contract details')
            // Check that the current page gets displayed twice: Within step indicator and heading
            expect(contractDetailsLabels).toHaveLength(2)
            // Check that the other pages appear once: Listed in the step indicator
            expect(screen.getByText('Submission details')).toBeInTheDocument()
            expect(screen.getByText('Contacts')).toBeInTheDocument()
            expect(screen.getByText('Review and submit')).toBeInTheDocument()
        })

        it('marks the current step correctly for EQRO submissions', () => {
            render(
                <DynamicStepIndicator
                    formPages={EQRO_SUBMISSION_FORM_ROUTES}
                    currentFormPage={EQRO_SUBMISSION_FORM_ROUTES[2]} // Contacts page
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                    }}
                />
            )

            const steps = screen.getAllByRole('listitem')

            // First two steps are complete
            expect(steps[0]).toHaveClass(
                'usa-step-indicator__segment--complete'
            )
            expect(steps[1]).toHaveClass(
                'usa-step-indicator__segment--complete'
            )

            // Third step (Contacts) are current
            expect(steps[2]).toHaveClass('usa-step-indicator__segment--current')

            // Fourth step is incomplete
            expect(steps[3]).toHaveClass('usa-step-indicator__segment', {
                exact: true,
            })
        })
    })

    describe('customPageTitles prop', () => {
        it('allows overriding multiple page titles', () => {
            render(
                <DynamicStepIndicator
                    formPages={EQRO_SUBMISSION_FORM_ROUTES}
                    currentFormPage={EQRO_SUBMISSION_FORM_ROUTES[0]}
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                        SUBMISSIONS_CONTACTS: 'Contacts',
                    }}
                />
            )
            const submissionDetailsLabels =
                screen.getAllByText('Submission details')
            expect(submissionDetailsLabels).toHaveLength(2)
            expect(screen.getByText('Contacts')).toBeInTheDocument()
        })

        it('maintains backward compatibility when customPageTitles is not provided', () => {
            render(
                <DynamicStepIndicator
                    formPages={STATE_SUBMISSION_FORM_ROUTES}
                    currentFormPage={STATE_SUBMISSION_FORM_ROUTES[0]}
                />
            )

            // Uses default titles from PageTitlesRecord
            const submissionTypeLabels = screen.getAllByText('Submission type')
            expect(submissionTypeLabels).toHaveLength(2)
            expect(screen.getByText('Contract details')).toBeInTheDocument()
        })
    })
})
