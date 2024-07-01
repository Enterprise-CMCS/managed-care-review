import { screen, render } from '@testing-library/react'
import { FieldTextarea } from './FieldTextarea'
import { Link } from '@trussworks/react-uswds'

const mockOnChange = vi.fn()
const mockSetValue = vi.fn()

// mock out formik hook as we are not testing formik
// needs to be before first describe
vi.mock('formik', () => {
    return {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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

describe('FieldTextarea component', () => {
    it('renders without errors', () => {
        render(
            <FieldTextarea
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
            <FieldTextarea
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

    it('displays hint', () => {
        render(
            <FieldTextarea
                id="input1"
                label="default label"
                name="input1"
                showError={false}
                hint={
                    <>
                        <Link
                            variant="nav"
                            href="https://www.medicaid.gov/medicaid/managed-care/managed-care-authorities/index.html"
                            target="_blank"
                        >
                            Managed Care entity definitions
                        </Link>
                        <span>
                            Provide a description of any major changes or
                            updates
                        </span>
                    </>
                }
            />
        )
        expect(
            screen.getByText(
                'Provide a description of any major changes or updates'
            )
        ).toBeInTheDocument()
    })

    it('displays with errors', () => {
        render(
            <FieldTextarea
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
            <FieldTextarea
                id="input1"
                label="default label"
                name="input1"
                showError={false}
                value="default value"
            />
        )
        expect(screen.getByDisplayValue('default value')).toBeInTheDocument()
    })
})
