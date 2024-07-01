import { renderWithProviders } from '../../testHelpers'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorBoundaryRoot } from './ErrorBoundaryRoot'
import { screen, waitFor } from '@testing-library/react'
import { fetchCurrentUserMock } from '../../testHelpers/apolloMocks'
import * as tracingHelper from '../../otelHelpers/tracingHelper'
import { expect, vi } from 'vitest'

describe('Error boundary tests', () => {
    it('react-error-boundary correctly renders ErrorBoundaryRoot', async () => {
        const ComponentThatThrowsError = () => {
            throw new Error('react-error-boundary caught the error')
        }
        const recordJSExceptionSpy = vi.spyOn(
            tracingHelper,
            'recordJSException'
        )

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
        expect(recordJSExceptionSpy).toHaveBeenCalledWith(
            'Crash in ErrorBoundaryRoot. Error message: Error: react-error-boundary caught the error'
        )
    })
})
