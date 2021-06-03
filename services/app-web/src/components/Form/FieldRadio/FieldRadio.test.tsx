import React from 'react'
import { screen, render } from '@testing-library/react'
import { FieldRadio } from './FieldRadio'

const mockOnChange = jest.fn()
const mockSetValue = jest.fn()

jest.mock('formik', () => {
    return {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-next-line
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

describe('FieldRadio component', () => {
    afterAll(() => {
        jest.clearAllMocks()
    })

    it('renders without errors', () => {
        render(
            <FieldRadio
                name="submissionType"
                id="contractOnly"
                label="Executed contract action only"
            />
        )
        screen.debug()
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
