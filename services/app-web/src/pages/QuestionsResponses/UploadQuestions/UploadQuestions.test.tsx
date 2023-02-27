import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { UploadQuestions } from './.'
import { renderWithProviders } from '../../../testHelpers'
import { RoutesRecord } from '../../../constants/routes'
import React from 'react'

describe('UploadQuestions', () => {
    it('displays correct cms division', async () => {
        const division = 'testDivision'
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_UPLOAD_QUESTION}
                    element={<UploadQuestions />}
                />
            </Routes>,
            {
                routerProvider: {
                    route: `/submissions/15/question-and-answers/${division}/upload-questions`,
                },
            }
        )

        // Expect text to display correct division from url parameters.
        await waitFor(() => {
            expect(
                screen.queryByRole('heading', {
                    name: /Add questions/,
                    level: 2,
                })
            ).toBeInTheDocument()
            expect(
                screen.queryByText(`Questions from ${division.toUpperCase()}`)
            ).toBeInTheDocument()
        })
    })
})
