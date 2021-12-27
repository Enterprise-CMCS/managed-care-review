import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PageActions } from './'

describe('PageActions', () => {
    describe('generic page behavior', () => {
        it('displays Save as Draft, Back and Continue buttons', () => {
            render(
                <PageActions
                    saveAsDraftOnClick={jest.fn()}
                    backOnClick={jest.fn()}
                />
            )
            const buttons = screen.getAllByRole('button')
            expect(buttons.length).toBe(3)

            buttons.forEach((button: HTMLElement) =>
                expect(button).not.toBeDisabled()
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
        it('calls backOnClick handler when Back button is clicked on a generic page', () => {
            const backAction = jest.fn()
            render(
                <PageActions
                    continueOnClick={jest.fn()}
                    saveAsDraftOnClick={jest.fn()}
                    backOnClick={backAction}
                />
            )

            userEvent.click(screen.getByRole('button', { name: 'Back' }))
            expect(backAction).toHaveBeenCalled()
        })
        it('calls saveAsDraftClick when Save as draft button is clicked on generic page', () => {
            const saveAction = jest.fn()
            render(
                <PageActions
                    continueOnClick={jest.fn()}
                    saveAsDraftOnClick={saveAction}
                    backOnClick={jest.fn()}
                />
            )

            userEvent.click(
                screen.getByRole('button', { name: 'Save as draft' })
            )
            expect(saveAction).toHaveBeenCalled()
        })
        it('calls continueClick when Continue button is clicked on generic page', () => {
            const continueAction = jest.fn()
            render(
                <PageActions
                    continueOnClick={continueAction}
                    saveAsDraftOnClick={jest.fn()}
                    backOnClick={jest.fn()}
                />
            )

            userEvent.click(screen.getByRole('button', { name: 'Continue' }))
            expect(continueAction).toHaveBeenCalled()
        })
        it('disables continue action when expected', () => {
            const continueAction = jest.fn()
            render(
                <PageActions
                    continueOnClick={continueAction}
                    saveAsDraftOnClick={jest.fn()}
                    backOnClick={jest.fn()}
                    continueDisabled
                />
            )

            userEvent.click(screen.getByRole('button', { name: 'Continue' }))
            expect(continueAction).not.toHaveBeenCalled()
        })
    })
    describe('page variant specific behavior', () => {
        it('displays Cancel and Continue buttons for the first page', () => {
            render(
                <PageActions
                    pageVariant="FIRST"
                    continueOnClick={jest.fn()}
                    saveAsDraftOnClick={jest.fn()}
                    backOnClick={jest.fn()}
                />
            )
            const buttons = screen.getAllByRole('button')
            expect(buttons.length).toBe(2)
            buttons.forEach((button: HTMLElement) =>
                expect(button).not.toBeDisabled()
            )

            expect(
                screen.getByRole('button', { name: 'Cancel' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Continue' })
            ).toBeInTheDocument()
        })
        it('displays Save as Draft, Back, and Submit buttons for the last page', () => {
            render(
                <PageActions
                    pageVariant="LAST"
                    continueOnClick={jest.fn()}
                    saveAsDraftOnClick={jest.fn()}
                    backOnClick={jest.fn()}
                />
            )
            const buttons = screen.getAllByRole('button')
            expect(buttons.length).toBe(3)
            buttons.forEach((button: HTMLElement) =>
                expect(button).not.toBeDisabled()
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

        it('calls the backOnClick handler when Cancel button is clicked on first page', () => {
            const backAction = jest.fn()
            render(
                <PageActions
                    pageVariant="FIRST"
                    continueOnClick={jest.fn()}
                    saveAsDraftOnClick={jest.fn()}
                    backOnClick={backAction}
                />
            )

            userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
            expect(backAction).toHaveBeenCalled()
        })

        it('calls continueOnClick when Submit button is clicked on the last page', () => {
            const continueAction = jest.fn()
            render(
                <PageActions
                    pageVariant="LAST"
                    continueOnClick={continueAction}
                    saveAsDraftOnClick={jest.fn()}
                    backOnClick={jest.fn()}
                />
            )

            userEvent.click(screen.getByRole('button', { name: 'Submit' }))
            expect(continueAction).toHaveBeenCalled()
        })
        it('disables submit action when expected on last page', () => {
            const continueAction = jest.fn()
            render(
                <PageActions
                    pageVariant="LAST"
                    continueOnClick={continueAction}
                    saveAsDraftOnClick={jest.fn()}
                    backOnClick={jest.fn()}
                    continueDisabled
                />
            )

            userEvent.click(screen.getByRole('button', { name: 'Submit' }))
            expect(continueAction).not.toHaveBeenCalled()
        })
    })
})
