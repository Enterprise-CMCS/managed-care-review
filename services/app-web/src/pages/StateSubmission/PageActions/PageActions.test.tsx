import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PageActions } from './'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { fetchCurrentUserMock } from '@mc-review/mocks'

describe('PageActions', () => {
    describe('generic page behavior', () => {
        it('displays Save as Draft, Back and Continue buttons', () => {
            renderWithProviders(
                <PageActions
                    saveAsDraftOnClick={vi.fn()}
                    backOnClick={vi.fn()}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )
            const buttons = screen.getAllByRole('button')
            expect(buttons).toHaveLength(3)

            buttons.forEach((button: HTMLElement) =>
                expect(button).not.toHaveAttribute('aria-disabled')
            )
            expect(
                screen.getByRole('button', { name: 'Save as draft' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Back' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Continue' })
            ).toBeInTheDocument()
        })
        it('calls backOnClick handler when Back button is clicked on a generic page', async () => {
            const backAction = vi.fn()
            renderWithProviders(
                <PageActions
                    continueOnClick={vi.fn()}
                    saveAsDraftOnClick={vi.fn()}
                    backOnClick={backAction}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            await userEvent.click(screen.getByRole('button', { name: 'Back' }))
            expect(backAction).toHaveBeenCalled()
        })
        it('calls saveAsDraftClick when Save as draft button is clicked on generic page', async () => {
            const saveAction = vi.fn()
            renderWithProviders(
                <PageActions
                    continueOnClick={vi.fn()}
                    saveAsDraftOnClick={saveAction}
                    backOnClick={vi.fn()}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            await userEvent.click(
                screen.getByRole('button', { name: 'Save as draft' })
            )
            expect(saveAction).toHaveBeenCalled()
        })
        it('calls continueClick when Continue button is clicked on generic page', async () => {
            const continueAction = vi.fn()
            renderWithProviders(
                <PageActions
                    continueOnClick={continueAction}
                    saveAsDraftOnClick={vi.fn()}
                    backOnClick={vi.fn()}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            await userEvent.click(
                screen.getByRole('button', { name: 'Continue' })
            )
            expect(continueAction).toHaveBeenCalled()
        })
        it('disables continue action when expected', async () => {
            const continueAction = vi.fn()
            renderWithProviders(
                <PageActions
                    continueOnClick={continueAction}
                    saveAsDraftOnClick={vi.fn()}
                    backOnClick={vi.fn()}
                    disableContinue
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            await userEvent.click(
                screen.getByRole('button', { name: 'Continue' })
            )
            expect(continueAction).not.toHaveBeenCalled()
        })
    })

    describe('page variant specific behavior', () => {
        it('displays Cancel and Continue buttons for the first page', () => {
            renderWithProviders(
                <PageActions
                    pageVariant="FIRST"
                    continueOnClick={vi.fn()}
                    saveAsDraftOnClick={vi.fn()}
                    backOnClick={vi.fn()}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )
            const buttons = screen.getAllByRole('button')
            expect(buttons).toHaveLength(2)
            buttons.forEach((button: HTMLElement) =>
                expect(button).not.toHaveAttribute('aria-disabled')
            )

            expect(
                screen.getByRole('button', { name: 'Cancel' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Continue' })
            ).toBeInTheDocument()
        })
        it('displays Save as Draft, Back, and Submit buttons for the last page', () => {
            renderWithProviders(
                <PageActions
                    pageVariant="LAST"
                    continueOnClick={vi.fn()}
                    saveAsDraftOnClick={vi.fn()}
                    backOnClick={vi.fn()}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )
            const buttons = screen.getAllByRole('button')
            expect(buttons).toHaveLength(3)
            buttons.forEach((button: HTMLElement) =>
                expect(button).not.toHaveAttribute('aria-disabled')
            )
            expect(
                screen.getByRole('button', { name: 'Save as draft' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Back' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Submit' })
            ).toBeInTheDocument()
        })

        it('calls the backOnClick handler when Cancel button is clicked on first page', async () => {
            const backAction = vi.fn()
            renderWithProviders(
                <PageActions
                    pageVariant="FIRST"
                    continueOnClick={vi.fn()}
                    saveAsDraftOnClick={vi.fn()}
                    backOnClick={backAction}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            await userEvent.click(
                screen.getByRole('button', { name: 'Cancel' })
            )
            expect(backAction).toHaveBeenCalled()
        })

        it('calls continueOnClick when Submit button is clicked on the last page', async () => {
            const continueAction = vi.fn()
            renderWithProviders(
                <PageActions
                    pageVariant="LAST"
                    continueOnClick={continueAction}
                    saveAsDraftOnClick={vi.fn()}
                    backOnClick={vi.fn()}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            await userEvent.click(
                screen.getByRole('button', { name: 'Submit' })
            )
            expect(continueAction).toHaveBeenCalled()
        })

        it('disables submit action when expected on last page', async () => {
            const continueAction = vi.fn()
            renderWithProviders(
                <PageActions
                    pageVariant="LAST"
                    continueOnClick={continueAction}
                    saveAsDraftOnClick={vi.fn()}
                    backOnClick={vi.fn()}
                    disableContinue
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            await userEvent.click(
                screen.getByRole('button', { name: 'Submit' })
            )
            expect(continueAction).not.toHaveBeenCalled()
        })

        it('displays Save as draft, Cancel and Continue buttons for the first page when editing', () => {
            renderWithProviders(
                <PageActions
                    pageVariant="EDIT_FIRST"
                    continueOnClick={vi.fn()}
                    saveAsDraftOnClick={vi.fn()}
                    backOnClick={vi.fn()}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )
            const buttons = screen.getAllByRole('button')
            expect(buttons).toHaveLength(3)
            buttons.forEach((button: HTMLElement) =>
                expect(button).not.toHaveAttribute('aria-disabled')
            )

            expect(
                screen.getByRole('button', { name: 'Save as draft' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Cancel' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Continue' })
            ).toBeInTheDocument()
        })
        it('calls continueOnClick when Continue button is clicked on the first page when editing', async () => {
            const continueAction = vi.fn()
            renderWithProviders(
                <PageActions
                    pageVariant="EDIT_FIRST"
                    continueOnClick={continueAction}
                    saveAsDraftOnClick={vi.fn()}
                    backOnClick={vi.fn()}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            await userEvent.click(
                screen.getByRole('button', { name: 'Continue' })
            )
            expect(continueAction).toHaveBeenCalled()
        })
        it('calls saveAsDraftOnClick when Save as draft button is clicked on the first page when editing', async () => {
            const saveAsDraftOnClick = vi.fn()
            renderWithProviders(
                <PageActions
                    pageVariant="EDIT_FIRST"
                    continueOnClick={vi.fn()}
                    saveAsDraftOnClick={saveAsDraftOnClick}
                    backOnClick={vi.fn()}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            await userEvent.click(
                screen.getByRole('button', { name: 'Save as draft' })
            )
            expect(saveAsDraftOnClick).toHaveBeenCalled()
        })
        it('calls backOnClick when Cancel button is clicked on the first page when editing', async () => {
            const backOnClick = vi.fn()
            renderWithProviders(
                <PageActions
                    pageVariant="EDIT_FIRST"
                    continueOnClick={vi.fn()}
                    saveAsDraftOnClick={vi.fn()}
                    backOnClick={backOnClick}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            await userEvent.click(
                screen.getByRole('button', { name: 'Cancel' })
            )
            expect(backOnClick).toHaveBeenCalled()
        })
    })

    describe('when async request is in progress', () => {
        it('disables all buttons', async () => {
            const continueAction = vi.fn()
            const saveAsDraftAction = vi.fn()
            const backAction = vi.fn()

            renderWithProviders(
                <PageActions
                    continueOnClick={continueAction}
                    saveAsDraftOnClick={vi.fn()}
                    backOnClick={vi.fn()}
                    actionInProgress
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            await userEvent.click(
                screen.getByTestId('page-actions-right-primary')
            )
            expect(continueAction).not.toHaveBeenCalled()

            await userEvent.click(
                screen.getByTestId('page-actions-right-primary')
            )
            expect(saveAsDraftAction).not.toHaveBeenCalled()

            await userEvent.click(screen.getByRole('button', { name: 'Back' }))
            expect(backAction).not.toHaveBeenCalled()
        })
    })
})
