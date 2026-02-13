import { renderWithProviders } from '../../testHelpers'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorBoundaryRoot } from './ErrorBoundaryRoot'
import { screen, waitFor } from '@testing-library/react'
import { fetchCurrentUserMock } from '@mc-review/mocks'
import * as tracingHelper from '@mc-review/otel'
import { expect, vi } from 'vitest'

describe('Error boundary tests', () => {
    let originalError: typeof console.error

    beforeAll(() => {
        // Store original console.error
        originalError = console.error
        // Replace console.error with filtered version

        console.error = (...args: any[]) => {
            // Suppress React ErrorBoundary warnings and our test error
            if (
                typeof args[0] === 'string' &&
                (args[0].includes('react-error-boundary caught the error') ||
                    args[0].includes('The above error occurred in the') ||
                    args[0].includes(
                        'React will try to recreate this component tree'
                    ))
            ) {
                return
            }
            originalError.call(console, ...args)
        }
    })

    afterAll(() => {
        console.error = originalError
    })

    beforeEach(() => {
        vi.spyOn(tracingHelper, 'recordJSException').mockImplementation(
            (_message) => {
                return undefined
            }
        )
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('react-error-boundary correctly renders ErrorBoundaryRoot', async () => {
        const expectedError = new Error('react-error-boundary caught the error')
        const ComponentThatThrowsError = () => {
            throw expectedError
        }

        renderWithProviders(
            <ErrorBoundary FallbackComponent={ErrorBoundaryRoot}>
                <ComponentThatThrowsError />
            </ErrorBoundary>,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            expect(screen.getByText('Managed Care Review')).toBeInTheDocument()
        })

        //Expect ErrorBoundaryRoot test to be in the document
        expect(await screen.findByText('System error')).toBeInTheDocument()
        expect(
            await screen.findByText(
                "We're having trouble loading this page. Please refresh your browser and if you continue to experience an error,"
            )
        ).toBeInTheDocument()

        // Expect error to be recorded to otel with the correct error thrown.
        // This verifies that the react-error-boundary component correctly passed in the thrown error it caught.
        await waitFor(() => {
            expect(tracingHelper.recordJSException).toHaveBeenCalledWith(
                'Crash in ErrorBoundaryRoot. Error message: react-error-boundary caught the error'
            )
        })
    })
})
