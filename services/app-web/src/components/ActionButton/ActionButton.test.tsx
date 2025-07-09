import { screen, waitFor } from '@testing-library/react'
import { ActionButton } from './ActionButton'
import { renderWithProviders } from '../../testHelpers'

describe('ActionButton', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.clearAllTimers()
    })

    it('renders without errors', () => {
        renderWithProviders(
            <ActionButton type="button">Test Button</ActionButton>
        )
        expect(
            screen.getByRole('button', {
                name: 'Test Button',
            })
        ).toBeInTheDocument()
    })

    describe('default state', () => {
        it('renders button with own text', () => {
            renderWithProviders(
                <ActionButton type="button" onClick={vi.fn()}>
                    Test Button Default
                </ActionButton>
            )

            expect(
                screen.getByRole('button', {
                    name: /Test Button/,
                })
            ).toBeInTheDocument()
        })

        it('renders button without disabled styles and aria-disabled', () => {
            renderWithProviders(
                <ActionButton type="button" onClick={vi.fn()}>
                    Test Button Default
                </ActionButton>
            )
            const defaultButton = screen.getByRole('button', {
                name: /Test Button/,
            })

            expect(defaultButton).not.toHaveAttribute('aria-disabled')
            expect(defaultButton.className).not.toContain(
                'usa-button--disabled'
            )
            expect(defaultButton.className).not.toContain('_disabledCursor_')
        })

        it('renders button without loading styles and spinner', async () => {
            renderWithProviders(
                <ActionButton type="button" onClick={vi.fn()}>
                    Test Button Default
                </ActionButton>
            )
            const defaultButton = screen.getByRole('button', {
                name: /Test Button/,
            })

            expect(defaultButton.className).not.toContain('usa-button--active')
            expect(defaultButton.className).not.toContain('_disabledCursor_')
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
        })
    })

    describe('loading state', () => {
        it('renders button with "Loading" instead instead of button text', () => {
            renderWithProviders(
                <ActionButton
                    type="button"
                    onClick={vi.fn()}
                    loading
                    animationTimeout={0}
                >
                    Test Button Loading
                </ActionButton>
            )

            expect(
                screen.getByRole('button', {
                    name: /Loading/,
                })
            ).toBeInTheDocument()
        })

        describe('loading animation timing', () => {
            it('renders button with active styles, spinner, and cursor', async () => {
                renderWithProviders(
                    <ActionButton
                        type="button"
                        onClick={vi.fn()}
                        loading
                        animationTimeout={0}
                    >
                        Test Button Loading
                    </ActionButton>
                )
                const loadingButton = screen.getByRole('button', {
                    name: /Loading/,
                })
                expect(loadingButton.className).toContain('usa-button--active')

                expect(loadingButton.className).toContain('_disabledCursor_')
                await waitFor(() => {
                    expect(screen.getByRole('progressbar')).toBeInTheDocument()
                    expect(screen.getByRole('progressbar').className).toContain(
                        '_ds-c-spinner_'
                    )
                })
            })

            it('by default, wait 750 ms before displaying loading spinner', async () => {
                renderWithProviders(
                    <ActionButton type="button" onClick={vi.fn()} loading>
                        Test Button Loading
                    </ActionButton>
                )

                expect(
                    screen.queryByRole('progressbar')
                ).not.toBeInTheDocument()
                vi.advanceTimersByTime(749)
                expect(
                    screen.queryByRole('progressbar')
                ).not.toBeInTheDocument()

                vi.advanceTimersByTime(1)
                await waitFor(() => {
                    expect(
                        screen.getByRole('button', { name: 'Loading' })
                    ).toBeInTheDocument()
                    expect(screen.getByRole('progressbar')).toBeInTheDocument()
                })
            })
        })
    })

    describe('disabled state', () => {
        it('renders button with own text', () => {
            renderWithProviders(
                <ActionButton type="button" onClick={vi.fn()} disabled>
                    Test Button Disabled
                </ActionButton>
            )

            expect(
                screen.getByRole('button', {
                    name: /Test Button/,
                })
            ).toBeInTheDocument()
        })

        it('renders button with aria-disabled attribute', () => {
            renderWithProviders(
                <ActionButton type="button" onClick={vi.fn()} disabled>
                    Test Button Disabled
                </ActionButton>
            )

            expect(
                screen.getByRole('button', {
                    name: /Test Button/,
                })
            ).toHaveAttribute('aria-disabled', 'true')
        })

        it('renders button with disabled styles and cursor', () => {
            renderWithProviders(
                <ActionButton type="button" onClick={vi.fn()} disabled>
                    Test Button Disabled
                </ActionButton>
            )

            expect(
                screen.getByRole('button', {
                    name: /Test Button/,
                })
            ).toHaveClass('usa-button--disabled')
            expect(
                screen.getByRole('button', {
                    name: /Test Button/,
                }).className
            ).toContain('_disabledCursor_')
        })
    })

    describe('incompatible props warning', () => {
        it('Console error when incompatible props are being used', () => {
            const consoleErrorMock = vi.spyOn(console, 'error')

            renderWithProviders(
                <ActionButton type="button" onClick={vi.fn()} disabled loading>
                    Test Button
                </ActionButton>
            )

            expect(consoleErrorMock).toHaveBeenCalled()

            consoleErrorMock.mockRestore()
        })
    })
})
