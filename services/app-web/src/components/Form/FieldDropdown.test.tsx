// import React from 'react'
// import { screen, render } from '@testing-library/react'
// import { FieldDropdown } from './FieldDropdown'
// import { useField } from 'formik';

// mock out formik hook as we are not testing formik
// needs to be before first describe

// I was mocking ou the test the same way that we mocked the FieldTextarea but that may not be the right way to deal with a dropdown.

// jest.mock('formik'); 

// describe('FieldDropdown component', () => {
//     it('renders without errors', () => {
//         const mockField = {
//             value: '',
//             checked: false,
//             onChange: jest.fn(),
//             onBlur: jest.fn(),
//             multiple: undefined,
//             name: 'input1',
//         };
        
//         useField.mockReturnValue([mockField]);

//         render(<FieldDropdown
//             label="Program"
//             id="input1"
//             showError={false}
//             name="input1"
//             options={[{key: 'key', value: 'value'}]}
//         />)
//         expect(screen.getAllByLabelText('Program')).toBeInTheDocument()
//     })
// })
