import { screen, render } from '@testing-library/react'
import { ErrorSummary } from './ErrorSummary'

describe('ErrorSummary component', () => {
    afterAll(() => {
        jest.clearAllMocks()
    })

    it('renders nothing when errors is empty', () => {
        render(
            <ErrorSummary
              errors={{}}
            />
        )

        expect(
            screen.queryByTestId("error-summary")
        ).not.toBeInTheDocument()
    })

    it('renders a summary for multiple errors', () => {
        render(
            <ErrorSummary
              errors={{title: "You must provide a title",
                       description: "You must provide a description"}}
            />
        )

        expect(
            screen.getByTestId("error-summary")
        ).toBeInTheDocument()

        expect(
            screen.queryAllByTestId("error-summary-message")
        ).toHaveLength(2)

        expect(
            screen.getByText("You must provide a title")
        ).toBeInTheDocument()

        expect(
            screen.getByText("You must provide a description")
        ).toBeInTheDocument()
    })

    it('autofocuses the heading by default', () => {
        render(
            <ErrorSummary
              errors={{title: "You must provide a title"}} />
        )

        expect(screen.getByText("There is 1 error on this page")).toHaveFocus()
    })

    it('does not autofocus when autofocus is false', () => {
        render(
            <ErrorSummary
              errors={{title: "You must provide a title"}}
              autofocus={false} />
        )

        expect(screen.getByText("There is 1 error on this page")).not.toHaveFocus()
    })
})
