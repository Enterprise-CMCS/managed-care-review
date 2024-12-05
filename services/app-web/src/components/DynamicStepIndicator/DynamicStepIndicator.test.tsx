import { screen, render } from '@testing-library/react'
import { DynamicStepIndicator } from './DynamicStepIndicator'

import { STATE_SUBMISSION_FORM_ROUTES } from '@mc-review/constants'
import { activeFormPages } from '../../pages/StateSubmission/StateSubmissionForm'
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
})
