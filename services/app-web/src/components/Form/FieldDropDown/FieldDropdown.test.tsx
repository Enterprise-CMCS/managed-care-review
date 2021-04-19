import React from 'react'
import { screen, render } from '@testing-library/react'
import { FieldDropdown } from './FieldDropdown'
import { useField } from 'formik';

// mock out formik hook as we are not testing formik
// needs to be before first describe

jest.mock('formik'); 

describe('FieldDropdown component', () => {
    it('renders without errors', () => {
        const mockField = {
            value: '',
            checked: false,
            onChange: jest.fn(),
            onBlur: jest.fn(),
            multiple: undefined,
            name: 'input1',
        };
        
        useField.mockReturnValue([mockField]);

        render(<FieldDropdown
            label="Program"
            id="input1"
            showError={false}
            name="input1"
            options={[{key: 'key', value: 'value'}]}
        />)
        expect(screen.getByLabelText('Program')).toBeInTheDocument()
    })

    it('displays hint', () => {
        const mockField = {
            value: '',
            checked: false,
            onChange: jest.fn(),
            onBlur: jest.fn(),
            multiple: undefined,
            name: 'input1',
        };

        useField.mockReturnValue([mockField]);

        render(<FieldDropdown
            label="Program"
            id="input1"
            showError={false}
            name="input1"
            options={[{key: 'key', value: 'value'}]}
            hint= {<span>You can change your program at any time.</span>}
        />)
        expect(screen.getByText('You can change your program at any time.')).toBeInTheDocument()
    })

    it('displays errors', () => {
        const mockField = {
            value: '',
            checked: false,
            onChange: jest.fn(),
            onBlur: jest.fn(),
            multiple: undefined,
            name: 'input1',
        };

        useField.mockReturnValue([mockField]);

        render(<FieldDropdown
            label="Program"
            id="input1"
            showError={true}
            name="input1"
            options={[{key: 'key', value: 'value'}]}
            error="Must select at least one program"
        />)
        expect(screen.getByText('Must select at least one program')).toBeInTheDocument()
        expect(screen.getByTestId('errorMessage')).toBeInTheDocument()
    })
})
