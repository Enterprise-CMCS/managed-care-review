import { screen, render } from '@testing-library/react'
import { FieldYesNo } from './FieldYesNo'

const mockOnChange = jest.fn()
const mockSetValue = jest.fn()

jest.mock('formik', () => {
    return {
        ...jest.requireActual('formik'),
        useField: () => [
            {
                onChange: mockOnChange,
            },
            { touched: true },
            { setValue: mockSetValue },
        ],
    }
})

describe('FieldYesNo component', () => {
    afterAll(() => {
        jest.clearAllMocks()
    })

    it('renders without errors', () => {
        render(
            <FieldYesNo
                name="submissionType"
                showError={true}
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
            <FieldYesNo
                name="submissionType"
                id="contractOnly"
                showError={true}
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
                <FieldYesNo
                    name="submissionType"
                    showError={true}
                    id="contractOnly"
                    aria-required
                    label="Executed contract action only"
                />
                <FieldYesNo
                    name="submissionType"
                    id="contractAndRates"
                    showError={true}
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
