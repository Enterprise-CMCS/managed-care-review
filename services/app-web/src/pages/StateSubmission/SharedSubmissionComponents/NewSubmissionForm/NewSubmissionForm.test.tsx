import { renderWithProviders } from '../../../../testHelpers'
import { Routes, Route, Location, generatePath } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { NewSubmission, NewSubmissionForm } from './NewSubmissionForm'
import React from 'react'
import { waitFor, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('routes to new health plan url', async () => {
    let testLocation: Location
    renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_NEW}
                element={<NewSubmission />}
            />
            <Route
                path={RoutesRecord.SUBMISSIONS_NEW_CONTRACT_FORM}
                element={<NewSubmissionForm />}
            />
        </Routes>,
        {
            routerProvider: {
                route: `/submissions/new`,
            },
            location: (location) => (testLocation = location),
        }
    )

    await waitFor(() => {
        expect(
            screen.getByRole('heading', { name: 'New submission' })
        ).toBeInTheDocument()
    })

    const healthPlanRadio = screen.getByRole('radio', { name: /Health plan/ })
    const startButton = screen.getByRole('button', { name: /Start/ })

    expect(startButton).toBeInTheDocument()
    expect(healthPlanRadio).toBeInTheDocument()

    await userEvent.click(healthPlanRadio)
    await userEvent.click(startButton)

    await waitFor(() => {
        expect(testLocation.pathname).toBe(
            generatePath(RoutesRecord.SUBMISSIONS_NEW_CONTRACT_FORM, {
                contractSubmissionType: 'health-plan',
            })
        )
    })
})

it('routes to new EQRO url', async () => {
    let testLocation: Location
    renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_NEW}
                element={<NewSubmission />}
            />
            <Route
                path={RoutesRecord.SUBMISSIONS_NEW_CONTRACT_FORM}
                element={<NewSubmissionForm />}
            />
        </Routes>,
        {
            routerProvider: {
                route: `/submissions/new`,
            },
            location: (location) => (testLocation = location),
        }
    )

    await waitFor(() => {
        expect(
            screen.getByRole('heading', { name: 'New submission' })
        ).toBeInTheDocument()
    })

    const eqroRadio = screen.getByRole('radio', {
        name: /External Quality Review Organization/,
    })
    const startButton = screen.getByRole('button', { name: /Start/ })

    expect(startButton).toBeInTheDocument()
    expect(eqroRadio).toBeInTheDocument()

    await userEvent.click(eqroRadio)
    await userEvent.click(startButton)

    await waitFor(() => {
        expect(testLocation.pathname).toBe(
            generatePath(RoutesRecord.SUBMISSIONS_NEW_CONTRACT_FORM, {
                contractSubmissionType: 'eqro',
            })
        )
    })
})

it('renders inline errors', async () => {
    renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_NEW}
                element={<NewSubmission />}
            />
            <Route
                path={RoutesRecord.SUBMISSIONS_NEW_CONTRACT_FORM}
                element={<NewSubmissionForm />}
            />
        </Routes>,
        {
            routerProvider: {
                route: `/submissions/new`,
            },
        }
    )

    await waitFor(() => {
        expect(
            screen.getByRole('heading', { name: 'New submission' })
        ).toBeInTheDocument()
    })

    const eqroRadio = screen.getByRole('radio', {
        name: /External Quality Review Organization/,
    })
    const startButton = screen.getByRole('button', { name: /Start/ })

    expect(startButton).toBeInTheDocument()
    expect(eqroRadio).toBeInTheDocument()

    await userEvent.click(startButton)

    expect(
        screen.getByText('You must select a contract type')
    ).toBeInTheDocument()

    await userEvent.click(eqroRadio)

    expect(screen.queryByText('You must select a contract type')).toBeNull()
})
