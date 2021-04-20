import React from 'react'
import { screen, render, getByLabelText } from '@testing-library/react'
import { FieldRadio } from './FieldRadio'
import { useField } from 'formik';
import { Redirect } from 'react-router';

// mock out formik hook as we are not testing formik
// needs to be before first describe

jest.mock('formik');

describe('FieldRadio component', () => {
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

        render(<FieldRadio
            name= "submissionType"
            id= "contractOnly"
            label= "Executed contract action only"
        />)
        expect(screen.getByLabelText('Executed contract action only')).toBeInTheDocument()
        expect(screen.getByLabelText('Executed contract action only')).toHaveAttribute('name', 'input1')
        expect(screen.getByLabelText('Executed contract action only')).toHaveAttribute('id', 'contractOnly')
    })
})