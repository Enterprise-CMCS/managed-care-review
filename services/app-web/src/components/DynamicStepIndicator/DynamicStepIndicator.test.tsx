import React from 'react'
import { screen, render } from '@testing-library/react'
import { DynamicStepIndicator } from './DynamicStepIndicator'

import { RouteT } from '../../constants/routes'

describe('DynamicStepIndicator', () => {
    const formPages = [
        'SUBMISSIONS_TYPE',
        'SUBMISSIONS_CONTRACT_DETAILS',
        'SUBMISSIONS_RATE_DETAILS',
        'SUBMISSIONS_CONTACTS',
        'SUBMISSIONS_DOCUMENTS',
        'SUBMISSIONS_REVIEW_SUBMIT',
    ] as RouteT[]

    it('renders without errors', () => {
        render(
            <DynamicStepIndicator
                formPages={formPages}
                currentFormPage={'SUBMISSIONS_CONTRACT_DETAILS'}
            />
        )

        expect(screen.getAllByRole('listitem').length).toBe(formPages.length)
    })

    it('displays previous steps with the correct styles', () => {
        render(
            <DynamicStepIndicator
                formPages={formPages}
                currentFormPage={formPages[4]}
            />
        )

        expect(screen.getAllByRole('listitem')[3]).toHaveClass(
            'usa-step-indicator__segment--complete'
        )
    })

    it('displays current step with the correct styles', () => {
        render(
            <DynamicStepIndicator
                formPages={formPages}
                currentFormPage={formPages[4]}
            />
        )

        expect(screen.getAllByRole('listitem')[4]).toHaveClass(
            'usa-step-indicator__segment--current'
        )
    })

    it('displays nothing when the current form page is passed an unknown route', () => {
        render(
            <div data-testid="container">
                <DynamicStepIndicator
                    formPages={formPages}
                    currentFormPage={'UNKNOWN_ROUTE'}
                />
            </div>
        )

        expect(screen.getByTestId('container')).toBeEmptyDOMElement()
    })
})
