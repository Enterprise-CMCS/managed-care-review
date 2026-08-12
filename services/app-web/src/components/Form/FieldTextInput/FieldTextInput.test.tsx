import { fireEvent, screen, render } from '@testing-library/react'
import { FieldTextInput } from './FieldTextInput'

const mockOnChange = vi.fn()
const mockOnBlur = vi.fn()
const mockSetValue = vi.fn()

// mock out formik hook as we are not testing formik
// needs to be before first describe
vi.mock('formik', () => {
    return {
        // @ts-ignore-next-line
        ...vi.importActual('formik'),
        useField: () => [
            {
                value: '   Mary Kate ',
                onChange: mockOnChange,
                onBlur: mockOnBlur,
            },
            {
                touched: true,
                error: 'You must provide a description of this document',
            },
            { setValue: mockSetValue },
        ],
    }
})

describe('FieldTextInput component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders without errors', () => {
        render(
            <FieldTextInput
                id="input1"
                label="default label"
                name="input1"
                showError={false}
                type="text"
            />
        )
        expect(screen.getByLabelText('default label')).toBeInTheDocument()
    })

    it('handles custom aria attributes', () => {
        render(
            <FieldTextInput
                id="input1"
                label="default label"
                name="input1"
                aria-required
                showError={false}
                type="text"
            />
        )
        expect(screen.getByLabelText('default label')).toHaveAttribute(
            'aria-required',
            'true'
        )
    })

    it('trims leading and trailing whitespace on blur', () => {
        render(
            <FieldTextInput
                id="input1"
                label="default label"
                name="input1"
                showError={false}
                type="text"
            />
        )

        fireEvent.blur(screen.getByLabelText('default label'))

        expect(mockSetValue).toHaveBeenCalledWith('Mary Kate')
        expect(mockOnBlur).toHaveBeenCalled()
    })

    it('displays hint', () => {
        render(
            <FieldTextInput
                id="input1"
                label="default label"
                name="input1"
                showError={false}
                hint={
                    <>
                        <span>
                            Provide a brief description of what this document is
                            about
                        </span>
                    </>
                }
                type="text"
            />
        )
        expect(
            screen.getByText(
                'Provide a brief description of what this document is about'
            )
        ).toBeInTheDocument()
    })

    it('displays with errors', () => {
        render(
            <FieldTextInput
                id="input1"
                label="default label"
                name="input1"
                showError={true}
                type="text"
            />
        )
        expect(
            screen.getByText('You must provide a description of this document')
        ).toBeInTheDocument()
        expect(screen.getByTestId('errorMessage')).toBeInTheDocument()
    })

    it('renders with value in field', () => {
        render(
            <FieldTextInput
                id="input1"
                label="default label"
                name="input1"
                showError={true}
                type="text"
                value="default value"
            />
        )
        expect(
            screen.getByText('You must provide a description of this document')
        ).toBeInTheDocument()
        expect(screen.getByDisplayValue('default value')).toBeInTheDocument()
    })
})
