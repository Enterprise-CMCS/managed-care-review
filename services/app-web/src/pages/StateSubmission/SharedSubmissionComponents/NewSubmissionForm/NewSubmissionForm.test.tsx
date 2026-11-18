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

const renderNewSubmissionRoutes = (
    route: string,
    featureFlags?: { 'ilos-submissions': boolean },
    onLocation?: (location: Location) => Location
) =>
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
            <Route
                path={RoutesRecord.DASHBOARD_SUBMISSIONS}
                element={<div>Dashboard page</div>}
            />
        </Routes>,
        {
            routerProvider: { route },
            location: onLocation,
            featureFlags,
        }
    )

describe('ILOS submission type', () => {
    const ilosRadioName = /In Lieu of Services actuarial report \(ILOS\)/

    it('does not render the ILOS radio when the flag is off', async () => {
        renderNewSubmissionRoutes('/submissions/new')

        await screen.findByRole('heading', { name: 'New submission' })

        expect(screen.queryByRole('radio', { name: ilosRadioName })).toBeNull()
    })

    it('renders the ILOS radio with its copy when the flag is on', async () => {
        renderNewSubmissionRoutes('/submissions/new', {
            'ilos-submissions': true,
        })

        expect(
            await screen.findByRole('radio', { name: ilosRadioName })
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Submit your final ILOS cost percentage report (ILOS actuarial report).'
            )
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Cancel' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Start' })
        ).toBeInTheDocument()
    })

    it('routes to the ILOS placeholder page on Start', async () => {
        let testLocation: Location | undefined
        renderNewSubmissionRoutes(
            '/submissions/new',
            { 'ilos-submissions': true },
            (location) => (testLocation = location)
        )

        await userEvent.click(
            await screen.findByRole('radio', { name: ilosRadioName })
        )
        await userEvent.click(screen.getByRole('button', { name: 'Start' }))

        expect(
            await screen.findByTestId('ilos-submission-details-placeholder')
        ).toBeInTheDocument()
        expect(testLocation?.pathname).toBe(
            generatePath(RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM, {
                contractSubmissionType: 'ilos',
            })
        )
    })

    it('returns to the dashboard on Cancel', async () => {
        let testLocation: Location | undefined
        renderNewSubmissionRoutes(
            '/submissions/new',
            { 'ilos-submissions': true },
            (location) => (testLocation = location)
        )

        await screen.findByRole('radio', { name: ilosRadioName })
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

        await waitFor(() => {
            expect(testLocation?.pathname).toBe(
                RoutesRecord.DASHBOARD_SUBMISSIONS
            )
        })
    })

    it('does not show the ILOS placeholder page when the flag is off', async () => {
        renderNewSubmissionRoutes('/submissions/new/ilos', {
            'ilos-submissions': false,
        })

        expect(
            await screen.findByRole('heading', { name: /Page not found/ })
        ).toBeInTheDocument()
        expect(
            screen.queryByTestId('ilos-submission-details-placeholder')
        ).toBeNull()
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
    expect(startButton).not.toHaveAttribute('aria-disabled')
    expect(eqroRadio).toBeInTheDocument()

    await userEvent.click(startButton)

    expect(
        screen.getByText('You must select a submission type')
    ).toBeInTheDocument()
    expect(startButton).toHaveAttribute('aria-disabled')

    await userEvent.click(eqroRadio)

    expect(screen.queryByText('You must select a submission type')).toBeNull()
})
