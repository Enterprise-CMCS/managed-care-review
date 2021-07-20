import React from 'react'
import * as Yup from 'yup'
import {
    Form as UswdsForm,
    FormGroup,
    Fieldset,
    Button,
    Link,
    ButtonGroup,
    Label,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors, FormikHelpers, Field, FieldArray, ErrorMessage } from 'formik'
import { NavLink, useHistory } from 'react-router-dom'

import styles from '../StateSubmissionForm.module.scss'

import {
    DraftSubmission,
    UpdateDraftSubmissionInput,
} from '../../../gen/gqlClient'
import {
    formatForForm
} from '../../../formHelpers'

import { updatesFromSubmission, stripTypename } from '../updateSubmissionTransform'
import { MCRouterState } from '../../../constants/routerState'

export interface ContactsFormValues {
    stateContacts: StateContactValue[]
}

export interface StateContactValue {
    name: string
    titleRole: string
    email: string
    phone: string
}

const phoneRegex = /\(?\d{3}\)?-? *\d{3}-? *-?\d{4}$/

const StateContactSchema = Yup.object().shape({
    stateContacts: Yup.array()
        .of(Yup.object().shape({
            name: Yup.string()
                .required('You must provide a name'),
            titleRole: Yup.string()
                .required('You must provide a title/role'),
            email: Yup.string()
                .email('You must enter a valid email address')
                .required('You must provide an email address'),
            phone: Yup.string()
                .matches(phoneRegex, 'You must enter a valid phone number')
                .required('You must provide a phone number')
        }))
})

type FormError = FormikErrors<ContactsFormValues>[keyof FormikErrors<ContactsFormValues>]

export const Contacts = ({
    draftSubmission,
    showValidations = false,
    updateDraft,
    formAlert = undefined,
}: {
    draftSubmission: DraftSubmission
    showValidations?: boolean
    formAlert?: React.ReactElement
    updateDraft: (
        input: UpdateDraftSubmissionInput
    ) => Promise<DraftSubmission | undefined>
}): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const redirectToDashboard = React.useRef(false)
    const history = useHistory<MCRouterState>()

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const stateContacts = stripTypename(draftSubmission.stateContacts)

    if (stateContacts.length === 0) {
        stateContacts.push({
            name: '',
            titleRole: '',
            email: '',
            phone: '',
        })
    }

    const contactsInitialValues: ContactsFormValues = {
      stateContacts: stateContacts
    }

    const handleFormSubmit = async (
        values: ContactsFormValues,
        formikHelpers: FormikHelpers<ContactsFormValues>
    ) => {
        const updatedDraft = updatesFromSubmission(draftSubmission)
        updatedDraft.stateContacts = values.stateContacts

        try {
            const updatedSubmission = await updateDraft({
                submissionID: draftSubmission.id,
                draftSubmissionUpdates: updatedDraft,
            })
            if (updatedSubmission) {
                if (redirectToDashboard.current) {
                    history.push(`/dashboard`, {
                        defaultProgramID: draftSubmission.programID,
                    })
                } else {
                    history.push(`/submissions/${draftSubmission.id}/documents`)
                }
            }
        } catch (serverError) {
            formikHelpers.setSubmitting(false)
            redirectToDashboard.current = false
        }
    }

    return (
        <>
            <Formik
                initialValues={contactsInitialValues}
                onSubmit={handleFormSubmit}
                validationSchema={StateContactSchema}
            >
                {({
                    values,
                    errors,
                    dirty,
                    handleSubmit,
                    isSubmitting,
                    isValidating,
                }) => (
                    <>
                        <UswdsForm
                            className={styles.formContainer}
                            id="ContactsForm"
                            aria-label="Contacts Form"
                            onSubmit={(e) => {
                                e.preventDefault()
                                console.log(errors)
                                if (!isValidating) handleSubmit()
                            }}
                        >
                            <fieldset className="usa-fieldset">
                                <h3>State contacts</h3>
                                {formAlert && formAlert}
                                <span>Provide contact information for the state personnel you'd like to recieve all CMS communication about this submission.</span>
                                <legend className="srOnly">State contacts</legend>
                                {formAlert && formAlert}

                                <FieldArray name="stateContacts">
                                {({ insert, remove, push }) => (
                                    <div className="row">
                                        {values.stateContacts.length > 0 &&
                                          values.stateContacts.map((stateContact, index) => (
                                            <Fieldset legend={"State contact " + index + " (required)"} key={index}>
                                                <FormGroup>
                                                    <label htmlFor={`stateContacts.${index}.name`}>
                                                        Name
                                                    </label>
                                                    <Field
                                                      name={`stateContacts.${index}.name`}
                                                      type="text"
                                                      className="usa-input"
                                                    />
                                                    <ErrorMessage
                                                        name={`stateContacts.${index}.name`}
                                                        component="div"
                                                        className="usa-error-message"
                                                    />
                                                </FormGroup>
                                                <FormGroup>
                                                    <label htmlFor={`stateContacts.${index}.titleRole`}>
                                                        Title/Role
                                                    </label>
                                                    <Field
                                                      name={`stateContacts.${index}.titleRole`}
                                                      type="text"
                                                      className="usa-input"
                                                    />
                                                    <ErrorMessage
                                                        name={`stateContacts.${index}.titleRole`}
                                                        component="div"
                                                        className="usa-error-message"
                                                    />
                                                </FormGroup>
                                                <FormGroup>
                                                    <label htmlFor={`stateContacts.${index}.email`}>
                                                        Email
                                                    </label>
                                                    <Field
                                                      name={`stateContacts.${index}.email`}
                                                      type="text"
                                                      className="usa-input"
                                                    />
                                                    <ErrorMessage
                                                        name={`stateContacts.${index}.email`}
                                                        component="div"
                                                        className="usa-error-message"
                                                    />
                                                </FormGroup>
                                                <FormGroup>
                                                    <label htmlFor={`stateContacts.${index}.phone`}>
                                                        Phone
                                                    </label>
                                                    <Field
                                                      name={`stateContacts.${index}.phone`}
                                                      type="text"
                                                      className="usa-input"
                                                    />
                                                    <ErrorMessage
                                                        name={`stateContacts.${index}.phone`}
                                                        component="div"
                                                        className="usa-error-message"
                                                    />
                                                </FormGroup>
                                                <Button
                                                  type="button"
                                                  unstyled
                                                  onClick={() => (remove(index))}
                                                >
                                                Remove contact
                                                </Button>
                                            </Fieldset>
                                        ))}

                                        <Button
                                          type="button"
                                          outline
                                          onClick={() => push({
                                            name: '',
                                            titleRole: '',
                                            email: '',
                                            phone: '',
                                          })}
                                        >
                                        Add state contact
                                        </Button>
                                    </div>
                                )}
                                </FieldArray>

                            </fieldset>


                            {/* TODO: dont show actuary contacts when contract only */}

                            <div className={styles.pageActions}>
                                <Button
                                    type="button"
                                    unstyled
                                    onClick={() => {
                                        if (!dirty) {
                                            history.push(`/dashboard`, {
                                                defaultProgramID:
                                                    draftSubmission.programID,
                                            })
                                        } else {
                                            setShouldValidate(true)
                                            if (!isValidating) {
                                                redirectToDashboard.current =
                                                    true
                                                handleSubmit()
                                            }
                                        }
                                    }}
                                >
                                    Save as draft
                                </Button>
                                <ButtonGroup
                                    type="default"
                                    className={styles.buttonGroup}
                                >
                                    <Link
                                        asCustom={NavLink}
                                        className="usa-button usa-button--outline"
                                        variant="unstyled"
                                        to={`rate-details`}
                                    >
                                        Back
                                    </Link>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        onClick={() => {
                                            redirectToDashboard.current = false
                                            setShouldValidate(true)
                                        }}
                                    >
                                        Continue
                                    </Button>
                                </ButtonGroup>
                            </div>
                        </UswdsForm>
                    </>
                )}
            </Formik>
        </>
    )
}
