import React from 'react'
import * as Yup from 'yup'
import {
    Form as UswdsForm,
    FormGroup,
    Fieldset,
    Button,
    Link,
    TextInput,
    ButtonGroup,
    Label,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors, FormikHelpers, Field, FieldArray } from 'formik'
import { NavLink, useHistory } from 'react-router-dom'

import styles from '../StateSubmissionForm.module.scss'

import {
    DraftSubmission,
    UpdateDraftSubmissionInput,
} from '../../../gen/gqlClient'
import {
    formatForForm
} from '../../../formHelpers'
import { FieldRadio } from '../../../components/Form/FieldRadio/FieldRadio'
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

    const contactsInitialValues: ContactsFormValues = {
        stateContacts: stripTypename(draftSubmission.stateContacts)
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
            >
                {({
                    values,
                    errors,
                    dirty,
                    handleSubmit,
                    isSubmitting,
                    isValidating,
                    setFieldValue,
                }) => (
                    <>
                        <UswdsForm
                            className={styles.formContainer}
                            id="ContactsForm"
                            aria-label="Contacts Form"
                            onSubmit={(e) => {
                                e.preventDefault()
                                if (!isValidating) handleSubmit()
                            }}
                        >
                            <fieldset className="usa-fieldset">
                                <h3>State contacts</h3>
                                <span>Provide contact information for the state personnel you'd like to recieve all CMS communication about this submission.</span>
                                <legend className="srOnly">State contacts</legend>
                                {formAlert && formAlert}

                                <>
                                    <FormGroup>

                                    <Fieldset legend="State contact 1 (required)">

                                        <FieldArray name="stateContacts">
                                        {({ insert, remove, push }) => (
                                            <>
                                            {values.stateContacts.length > 0 &&
                                              values.stateContacts.map((stateContact, index) => (
                                                <div key={index}>
                                                    <label htmlFor={`stateContacts.${index}.name`}>
                                                        Name
                                                    </label>
                                                    <Field
                                                      name={`stateContacts.${index}.name`}
                                                      type="text"
                                                    />
                                                    <label htmlFor={`stateContacts.${index}.titleRole`}>
                                                        Title/Role
                                                    </label>
                                                    <Field
                                                      name={`stateContacts.${index}.titleRole`}
                                                      type="text"
                                                    />
                                                    <label htmlFor={`stateContacts.${index}.email`}>
                                                        Email
                                                    </label>
                                                    <Field
                                                      name={`stateContacts.${index}.email`}
                                                      type="text"
                                                    />
                                                    <label htmlFor={`stateContacts.${index}.phone`}>
                                                        Phone
                                                    </label>
                                                    <Field
                                                      name={`stateContacts.${index}.phone`}
                                                      type="text"
                                                    />
                                                </div>
                                            ))}
                                            {values.stateContacts.length === 0 &&
                                              <>
                                                  <label htmlFor={`stateContacts.0.name`}>
                                                      Name
                                                  </label>
                                                  <Field
                                                    name={`stateContacts.0.name`}
                                                    type="text"
                                                  />
                                                  <label htmlFor={`stateContacts.0.titleRole`}>
                                                      Title/Role
                                                  </label>
                                                  <Field
                                                    name={`stateContacts.0.titleRole`}
                                                    type="text"
                                                  />
                                                  <label htmlFor={`stateContacts.0.email`}>
                                                      Email
                                                  </label>
                                                  <Field
                                                    name={`stateContacts.0.email`}
                                                    type="text"
                                                  />
                                                  <label htmlFor={`stateContacts.0.phone`}>
                                                      Phone
                                                  </label>
                                                  <Field
                                                    name={`stateContacts.0.phone`}
                                                    type="text"
                                                  />
                                              </>
                                            }
                                            </>
                                        )}
                                        </FieldArray>

                                    </Fieldset>

{/*
                                    {values.stateContacts.map((item) => (
                                      <Fieldset legend="State contact 1 (required)">
                                          <Label
                                              htmlFor="stateContactName"
                                              id="stateContactName"
                                          >
                                          Name
                                          </Label>
                                          <Field
                                              id="stateContactName"
                                              name="stateContactName"
                                              type="text"
                                              defaultValue={item.name}
                                          />
                                          <Label
                                              htmlFor="stateContactTitleRole"
                                              id="stateContactTitleRole"
                                          >
                                          Title/Role
                                          </Label>
                                          <TextInput
                                              id="stateContactTitleRole"
                                              name="stateContactTitleRole"
                                              type="text"
                                              defaultValue={item.titleRole}
                                          />
                                          <Label
                                              htmlFor="stateContactEmail"
                                              id="stateContactEmail"
                                          >
                                          Email
                                          </Label>
                                          <TextInput
                                              id="stateContactEmail"
                                              name="stateContactEmail"
                                              type="text"
                                              defaultValue={item.email}
                                          />
                                          <Label
                                              htmlFor="stateContactPhone"
                                              id="stateContactPhone"
                                          >
                                          Phone
                                          </Label>
                                          <TextInput
                                              id="stateContactPhone"
                                              name="stateContactPhone"
                                              type="text"
                                              defaultValue={item.phone}
                                          />
                                      </Fieldset>
                                    ))}
                                    */}

                                    </FormGroup>
                                </>
                            </fieldset>


                            {/* TODO: dont show actuary when contract only */}

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
