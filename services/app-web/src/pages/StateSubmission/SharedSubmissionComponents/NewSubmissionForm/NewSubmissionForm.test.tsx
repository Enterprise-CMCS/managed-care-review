import { renderWithProviders } from '../../../../testHelpers'
import { Routes, Route, Location, generatePath } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { NewSubmission, NewSubmissionForm } from './NewSubmissionForm'
import React from 'react'
import { waitFor, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach } from 'vitest'

const originalLocation = window.location
afterEach(() => {
    Object.defineProperty(window, 'location', {
        writable: true,
        value: originalLocation,
    })
})

it('routes to new health plan url', async () => {
    let testLocation: Location
    renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_NEW}
                element={<NewSubmission />}
            />
            <Route
                path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
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
            generatePath(RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM, {
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
                path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
                element={<NewSubmissionForm />}
            />
        </Routes>,
        {
            routerProvider: {
                route: `/submissions/new`,
            },
            location: (location) => (testLocation = location),
            featureFlags: {
                ['eqro-submissions']: true,
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

    await userEvent.click(eqroRadio)
    await userEvent.click(startButton)

    await waitFor(() => {
        expect(testLocation.pathname).toBe(
            generatePath(RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM, {
                contractSubmissionType: 'eqro',
            })
        )
    })
})

it('does not render SDP radio when SDP flag is off', async () => {
    renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_NEW}
                element={<NewSubmission />}
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

    expect(
        screen.queryByRole('radio', {
            name: /State Directed Payment Preprint/,
        })
    ).toBeNull()
})

it('renders SDP radio when SDP flag is on', async () => {
    renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_NEW}
                element={<NewSubmission />}
            />
        </Routes>,
        {
            routerProvider: {
                route: `/submissions/new`,
            },
            featureFlags: {
                sdp: true,
            },
        }
    )

    await waitFor(() => {
        expect(
            screen.getByRole('heading', { name: 'New submission' })
        ).toBeInTheDocument()
    })

    expect(
        screen.getByRole('radio', {
            name: /State Directed Payment Preprint/,
        })
    ).toBeInTheDocument()
})

it('redirects to Salesforce SDP URL when SDP is selected and flag is on', async () => {
    import.meta.env.VITE_APP_SDP_PORTAL_URL = 'https://test.example.com/sdp'
    Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...originalLocation, href: '' },
    })

    renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_NEW}
                element={<NewSubmission />}
            />
        </Routes>,
        {
            routerProvider: {
                route: `/submissions/new`,
            },
            featureFlags: {
                sdp: true,
            },
        }
    )

    const sdpRadio = await screen.findByRole('radio', {
        name: /State Directed Payment Preprint/,
    })
    const startButton = screen.getByRole('button', { name: /Start/ })

    await userEvent.click(sdpRadio)
    await userEvent.click(startButton)

    await waitFor(() => {
        expect(window.location.href).toBe('https://test.example.com/sdp')
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
                path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
                element={<NewSubmissionForm />}
            />
        </Routes>,
        {
            routerProvider: {
                route: `/submissions/new`,
            },
            featureFlags: {
                ['eqro-submissions']: true,
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
        screen.getByText('You must select a submission type')
    ).toBeInTheDocument()

    await userEvent.click(eqroRadio)

    expect(screen.queryByText('You must select a submission type')).toBeNull()
})
