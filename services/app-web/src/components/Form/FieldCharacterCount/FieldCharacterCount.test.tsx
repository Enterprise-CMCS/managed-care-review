import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FieldCharacterCount } from './FieldCharacterCount'

const mockOnChange = vi.fn()
const mockSetValue = vi.fn()

// mock out formik hook as we are not testing formik
// needs to be before first describe
vi.mock('formik', () => {
    return {
        // @ts-ignore-next-line
        ...vi.importActual('formik'),
        useField: () => [
            {
                onChange: mockOnChange,
            },
            {
                touched: true,
                error: 'You must provide a description of any major changes or updates',
            },
            { setValue: mockSetValue },
        ],
    }
})

describe('FieldCharacterCount component', () => {
    it('renders without errors', () => {
        render(
            <FieldCharacterCount
                id="input1"
                label="default label"
                name="input1"
                showError={false}
            />
        )

        expect(screen.getByLabelText('default label')).toBeInTheDocument()
    })

    it('handles custom aria attributes', () => {
        render(
            <FieldCharacterCount
                id="input1"
                label="default label"
                name="input1"
                aria-required
                showError={false}
            />
        )
        expect(screen.getByLabelText('default label')).toHaveAttribute(
            'aria-required',
            'true'
        )
    })

    it('displays with errors', () => {
        render(
            <FieldCharacterCount
                id="input1"
                label="default label"
                name="input1"
                showError={true}
            />
        )
        expect(
            screen.getByText(
                'You must provide a description of any major changes or updates'
            )
        ).toBeInTheDocument()
        expect(screen.getByTestId('errorMessage')).toBeInTheDocument()
    })

    it('renders with value in textarea', () => {
        render(
            <FieldCharacterCount
                id="input1"
                label="default label"
                name="input1"
                showError={false}
                value="default value"
            />
        )
        expect(screen.getByDisplayValue('default value')).toBeInTheDocument()
    })

    it('renders character count message', () => {
        render(
            <FieldCharacterCount
                id="input1"
                label="default label"
                name="input1"
                showError={false}
            />
        )
        expect(screen.getByTestId('characterCountMessage')).toHaveTextContent(
            '1500 characters allowed'
        )
    })

    it('shows over-limit warning when character count exceeds 1500', async () => {
        render(
            <FieldCharacterCount
                id="input1"
                label="default label"
                name="input1"
                showError={false}
            />
        )
        const textarea = screen.getByRole('textbox', { name: 'default label' })
        await userEvent.click(textarea)
        await userEvent.paste('a'.repeat(1501))

        expect(screen.getByTestId('characterCountMessage')).toHaveTextContent(
            '1 character over limit'
        )
        expect(screen.getByTestId('characterCountMessage')).toHaveClass(
            'usa-character-count__message--invalid'
        )
    })

    it('shows accurate count of characters remaining', async () => {
        render(
            <FieldCharacterCount
                id="input1"
                label="default label"
                name="input1"
                showError={false}
            />
        )
        const textarea = screen.getByRole('textbox', { name: 'default label' })
        await userEvent.click(textarea)
        await userEvent.paste('a'.repeat(10))

        expect(screen.getByTestId('characterCountMessage')).toHaveTextContent(
            '1490 characters left'
        )
    })
})
