import React from 'react'
import { Formik } from 'formik'
import { FormTextarea } from './FieldTextarea'
import { Link } from '@trussworks/react-uswds'

export default {
    title: 'Components/Forms/FieldTextarea',
    component: FormTextarea,
}

export const Default = (): React.ReactElement => 
<Formik
    initialValues={{input1: ''}}
    onSubmit={e => console.log('submitted')}
>
    <FormTextarea 
        label="Submission description"
        id="submission-description"
        showError={false}
        name="submission-description"
    />
</Formik>


export const WithHint = (): React.ReactElement => 
<Formik
    initialValues={{input1: ''}}
    onSubmit={e => console.log('submitted')}
>
    <FormTextarea 
        label="Submission description"
        id="submission-description"
        showError={false}
        name="submission-description"
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
</Formik>

export const WithError = (): React.ReactElement => 
<Formik
    initialValues={{input1: ''}}
    onSubmit={e => console.log('submitted')}
>
    <FormTextarea 
        label="Submission description"
        id="submission-description"
        showError={true}
        name="submission-description"
        error="You must provide a description of any major changes or updates"
    />
</Formik>