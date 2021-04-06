import React from 'react'
import { screen, render } from '@testing-library/react'
import { FormTextarea } from './FieldTextarea'
import { Link } from '@trussworks/react-uswds'
import { useField } from 'formik'; // Also saw this in Suz's test file, unsure if I need this

// mock out formik hook as we are not testing formik
// needs to be before first describe

jest.mock('formik'); // I'm not sure if I need this, I saw it in Suz's test file

describe('FieldTextarea component', () => {
    it('renders without errors', () => {
        // Do these need to be wrapped in <Formik> like the stories?
        render(<FormTextarea 
            id="input1" 
            label="default label" 
            name="input1" 
            showError={false}/>)
        expect(screen.getByLabelText('default label')).toBeInTheDocument()
    })

    it('displays hint', () => {
        render(<FormTextarea 
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
                    >Managed Care entity definitions</Link>
                    <span>Provide a description of any major changes or updates</span>
                </>
            }
            />
            )
        expect(screen.getByText('Provide a description of any major changes or updates')).toBeInTheDocument()
    })

    it('displays with errors', () => {
        render(<FormTextarea 
            id="input1" 
            label="default label" 
            name="input1" 
            showError={true}
            error="You must provide a description of any major changes or updates"
            />
            )
        expect(screen.getByText('You must provide a description of any major changes or updates')).toBeInTheDocument()
        expect(screen.getByTestId('errorMessage')).toBeInTheDocument()
    })
})
