import { screen, render } from '@testing-library/react'
import { FieldCheckbox } from './FieldCheckbox'

const mockOnChange = vi.fn()
const mockSetValue = vi.fn()

vi.mock('formik', () => {
    return {
        ...vi.importActual('formik'),
        useField: () => [
            {
                onChange: mockOnChange,
            },
            { touched: true },
            { setValue: mockSetValue },
        ],
    }
})

describe('FieldCheckbox component', () => {
    afterAll(() => {
        vi.clearAllMocks()
    })

    it('renders without errors', () => {
        render(
            <FieldCheckbox
                name="managedCareEntity"
                id="mco"
                label="Managed Care Organization (MCO)"
            />
        )
        expect(
            screen.getByLabelText('Managed Care Organization (MCO)')
        ).toBeInTheDocument()
        expect(
            screen.getByLabelText('Managed Care Organization (MCO)')
        ).toHaveAttribute('name', 'managedCareEntity')
        expect(
            screen.getByLabelText('Managed Care Organization (MCO)')
        ).toHaveAttribute('id', 'mco')
    })

    it('handles custom aria attributes', () => {
        render(
            <FieldCheckbox
                name="managedCareEntity"
                id="mco"
                aria-required
                label="Managed Care Organization (MCO)"
            />
        )
        expect(
            screen.getByLabelText('Managed Care Organization (MCO)')
        ).toBeInTheDocument()
        expect(
            screen.getByLabelText('Managed Care Organization (MCO)')
        ).toHaveAttribute('aria-required', 'true')
    })

    it('renders as checked when expected', () => {
        render(
            <fieldset>
                <FieldCheckbox
                    name="managedCareEntity"
                    id="foobar"
                    aria-required
                    label="Foobar"
                />
                <FieldCheckbox
                    name="managedCareEntity"
                    id="mco"
                    aria-required
                    label="Managed Care Organization (MCO)"
                    checked
                />
            </fieldset>
        )
        expect(screen.getByLabelText('Foobar')).not.toBeChecked()
        expect(
            screen.getByLabelText('Managed Care Organization (MCO)')
        ).toBeChecked()
    })
})
