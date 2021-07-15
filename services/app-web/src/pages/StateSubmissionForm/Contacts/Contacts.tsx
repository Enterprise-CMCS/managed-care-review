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
import { Formik, FormikErrors, FormikHelpers } from 'formik'
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
import { updatesFromSubmission } from '../updateSubmissionTransform'
import { MCRouterState } from '../../../constants/routerState'

export interface ContactsFormValues {
    stateContactName: string
    stateContactTitleRole: string
    stateContactEmail: string
    stateContactPhone: string
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
        stateContactName: draftSubmission?.stateContactName,
        stateContactTitleRole: draftSubmission?.stateContactTitleRole,
        stateContactEmail: draftSubmission?.stateContactEmail,
        stateContactPhone: draftSubmission?.stateContactPhone,
    }

    const handleFormSubmit = async (
        values: ContactsFormValues,
        formikHelpers: FormikHelpers<ContactsFormValues>
    ) => {
        const updatedDraft = updatesFromSubmission(draftSubmission)
        updatedDraft.stateContactName = values.stateContactName
        updatedDraft.stateContactTitleRole = values.stateContactTitleRole
        updatedDraft.stateContactEmail = values.stateContactEmail
        updatedDraft.stateContactPhone = values.stateContactPhone

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
                                            <Label
                                                htmlFor="stateContactName"
                                                id="stateContactName"
                                            >
                                            Name
                                            </Label>
                                            <TextInput
                                                id="stateContactName"
                                                name="stateContactName"
                                                type="text"
                                                defaultValue={values.stateContactName}
                                                onChange={(e) =>
                                                    setFieldValue('stateContactName', e.target.value)
                                                }
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
                                                defaultValue={values.stateContactTitleRole}
                                                onChange={(e) =>
                                                    setFieldValue('stateContactTitleRole', e.target.value)
                                                }
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
                                                defaultValue={values.stateContactEmail}
                                                onChange={(e) =>
                                                    setFieldValue('stateContactEmail', e.target.value)
                                                }
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
                                                defaultValue={values.stateContactPhone}
                                                onChange={(e) =>
                                                    setFieldValue('stateContactPhone', e.target.value)
                                                }
                                            />
                                        </Fieldset>
                                    </FormGroup>
                                </>
                            </fieldset>

                            {/* TODO: dont show when contract only */}
                            <fieldset className="usa-fieldset">
                                <h3>Actuary contacts</h3>
                                <span>Provide contact information for actuaries who worked directly on this submission.</span>
                                <legend className="srOnly">Actuary contacts</legend>
                                {formAlert && formAlert}

                                <>
                                    <FormGroup>
                                        <Fieldset legend="Certifying actuary (required)">
                                            <Label
                                                htmlFor="certifyingActuaryName1"
                                                id="certifyingActuaryName1"
                                            >
                                            Name
                                            </Label>
                                            <TextInput
                                                id="certifyingActuaryName1"
                                                name="certifyingActuaryName1"
                                                type="text"
                                                defaultValue=""
                                            />
                                            <Label
                                                htmlFor="certifyingActuaryTitleRole1"
                                                id="certifyingActuaryTitleRole1"
                                            >
                                            Title/Role
                                            </Label>
                                            <TextInput
                                                id="certifyingActuaryTitleRole1"
                                                name="certifyingActuaryTitleRole1"
                                                type="text"
                                                defaultValue=""
                                            />
                                            <Label
                                                htmlFor="certifyingActuaryEmail1"
                                                id="certifyingActuaryEmail1"
                                            >
                                            Email
                                            </Label>
                                            <TextInput
                                                id="certifyingActuaryEmail1"
                                                name="certifyingActuaryEmail1"
                                                type="text"
                                                defaultValue=""
                                            />
                                            <Label
                                                htmlFor="certifyingActuaryPhone1"
                                                id="certifyingActuaryPhone1"
                                            >
                                            Phone
                                            </Label>
                                            <TextInput
                                                id="certifyingActuaryPhone1"
                                                name="certifyingActuaryPhone1"
                                                type="text"
                                                defaultValue=""
                                            />
                                        </Fieldset>
                                    </FormGroup>
                                </>
                            </fieldset>

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
