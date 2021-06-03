import React from 'react'
import { screen, render, prettyDOM } from '@testing-library/react'
import { FieldCheckbox } from './FieldCheckbox'

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

describe('FieldCheckbox component', () => {
    afterAll(() => {
        jest.clearAllMocks()
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
            <FieldCheckbox
                name="managedCareEntity"
                id="mco"
                aria-required
                label="Managed Care Organization (MCO)"
                checked
            />
        )
        expect(
            screen.getByLabelText('Managed Care Organization (MCO)')
        ).toBeInTheDocument()
        expect(
            screen.getByLabelText('Managed Care Organization (MCO)')
        ).toBeChecked()
    })
})
