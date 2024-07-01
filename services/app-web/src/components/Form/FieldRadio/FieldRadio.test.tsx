import { screen, render } from '@testing-library/react'
import { FieldRadio } from './FieldRadio'

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

describe('FieldRadio component', () => {
    afterAll(() => {
        vi.clearAllMocks()
    })

    it('renders without errors', () => {
        render(
            <FieldRadio
                name="submissionType"
                id="contractOnly"
                label="Executed contract action only"
            />
        )
        expect(
            screen.getByLabelText('Executed contract action only')
        ).toBeInTheDocument()
        expect(
            screen.getByLabelText('Executed contract action only')
        ).toHaveAttribute('name', 'submissionType')
        expect(
            screen.getByLabelText('Executed contract action only')
        ).toHaveAttribute('id', 'contractOnly')
    })

    it('handles custom aria attributes', () => {
        render(
            <FieldRadio
                name="submissionType"
                id="contractOnly"
                aria-required
                label="Executed contract action only"
            />
        )
        expect(
            screen.getByLabelText('Executed contract action only')
        ).toBeInTheDocument()
        expect(
            screen.getByLabelText('Executed contract action only')
        ).toHaveAttribute('aria-required', 'true')
    })

    it('renders as checked when expected', () => {
        render(
            <fieldset>
                <FieldRadio
                    name="submissionType"
                    id="contractOnly"
                    aria-required
                    label="Executed contract action only"
                />
                <FieldRadio
                    name="submissionType"
                    id="contractAndRates"
                    aria-required
                    label="Contract and rates"
                    checked
                />
            </fieldset>
        )
        expect(
            screen.getByLabelText('Executed contract action only')
        ).toBeInTheDocument()
        expect(screen.getByLabelText('Contract and rates')).toBeInTheDocument()
        expect(
            screen.getByLabelText('Executed contract action only')
        ).not.toBeChecked()
        expect(screen.getByLabelText('Contract and rates')).toBeChecked()
    })
})
