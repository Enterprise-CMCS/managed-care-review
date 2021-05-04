import React from 'react'
import { screen, render, getByLabelText } from '@testing-library/react'
import { FieldCheckbox } from './FieldCheckbox'
import { useField } from 'formik'
import { Redirect } from 'react-router'

// mock out formik hook as we are not testing formik
// needs to be before first describe

jest.mock('formik')

describe('FieldCheckbox component', () => {
    it('renders without errors', () => {
        const mockField = {
            value: '',
            checked: false,
            onChange: jest.fn(),
            onBlur: jest.fn(),
            multiple: undefined,
            name: 'input1',
        }

        useField.mockReturnValue([mockField])

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
        ).toHaveAttribute('name', 'input1')
        expect(
            screen.getByLabelText('Managed Care Organization (MCO)')
        ).toHaveAttribute('id', 'mco')
    })

    it('handles custom aria attributes', () => {
        const mockField = {
            value: '',
            checked: false,
            onChange: jest.fn(),
            onBlur: jest.fn(),
            multiple: undefined,
            name: 'input1',
        }

        useField.mockReturnValue([mockField])

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
        const mockField = {
            value: '',
            checked: true,
            onChange: jest.fn(),
            onBlur: jest.fn(),
            multiple: undefined,
            name: 'input1',
        }

        useField.mockReturnValue([mockField])

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
        ).toBeChecked()
    })
})
