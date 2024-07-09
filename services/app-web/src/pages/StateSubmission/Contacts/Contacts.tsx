import React, { useEffect } from 'react'
import * as Yup from 'yup'
import { Form as UswdsForm, Fieldset } from '@trussworks/react-uswds'
import {
    Formik,
    FormikErrors,
    FormikHelpers,
    FieldArray,
    getIn,
    FieldArrayRenderProps,
} from 'formik'
import { generatePath, useNavigate } from 'react-router-dom'

import styles from '../StateSubmissionForm.module.scss'

import { StateContact } from '../../../common-code/healthPlanFormDataType'

import { ErrorSummary, FieldTextInput } from '../../../components/Form'

import { useFocus } from '../../../hooks/useFocus'
import { PageActions } from '../PageActions'
import {
    activeFormPages,
    type HealthPlanFormPageProps,
} from '../StateSubmissionForm'
import { RoutesRecord } from '../../../constants'
import {
    ButtonWithLogging,
    DynamicStepIndicator,
    SectionCard,
} from '../../../components'
import { FormContainer } from '../FormContainer'
import {
    useCurrentRoute,
    useHealthPlanPackageForm,
    useRouteParams,
    useTealium,
} from '../../../hooks'
import { useAuth } from '../../../contexts/AuthContext'
import { ErrorOrLoadingPage } from '../ErrorOrLoadingPage'
import { PageBannerAlerts } from '../PageBannerAlerts'
import { useErrorSummary } from '../../../hooks/useErrorSummary'

export interface ContactsFormValues {
    stateContacts: StateContact[]
}

type FormError =
    FormikErrors<ContactsFormValues>[keyof FormikErrors<ContactsFormValues>]

// Convert the formik errors into a shape that can be passed to ErrorSummary
const flattenErrors = (
    errors: FormikErrors<ContactsFormValues>
): { [field: string]: string } => {
    const flattened: { [field: string]: string } = {}

    if (errors.stateContacts && Array.isArray(errors.stateContacts)) {
        errors.stateContacts.forEach((contact, index) => {
            if (!contact) return

            Object.entries(contact).forEach(([field, value]) => {
                const errorKey = `stateContacts.${index}.${field}`
                flattened[errorKey] = value
            })
        })
    }

    return flattened
}

const Contacts = ({
    showValidations = false,
}: HealthPlanFormPageProps): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const [focusNewContact, setFocusNewContact] = React.useState(false)
    const [focusNewActuaryContact, setFocusNewActuaryContact] =
        React.useState(false)
    const { setFocusErrorSummaryHeading, errorSummaryHeadingRef } =
        useErrorSummary()
    const { logButtonEvent } = useTealium()

    // set up API handling and HPP data
    const { loggedInUser } = useAuth()
    const { currentRoute } = useCurrentRoute()
    const { id } = useRouteParams()
    const {
        draftSubmission,
        interimState,
        updateDraft,
        showPageErrorMessage,
        unlockInfo,
    } = useHealthPlanPackageForm(id)

    const redirectToDashboard = React.useRef(false)
    const newStateContactNameRef = React.useRef<HTMLInputElement | null>(null) // This ref.current is reset to the newest contact name field each time new contact is added
    const [newStateContactButtonRef, setNewStateContactButtonFocus] = useFocus() // This ref.current is always the same element

    const newActuaryContactNameRef = React.useRef<HTMLInputElement | null>(null)

    const navigate = useNavigate()

    /*
     Set focus to contact name field when adding new contacts.
     Clears ref and focusNewContact component state immediately after. The reset allows additional contacts to be added and preserves expected focus behavior.
    */
    useEffect(() => {
        if (focusNewContact) {
            newStateContactNameRef.current &&
                newStateContactNameRef.current.focus()
            setFocusNewContact(false)
            newStateContactNameRef.current = null
        }
        if (focusNewActuaryContact) {
            newActuaryContactNameRef.current &&
                newActuaryContactNameRef.current.focus()
            setFocusNewActuaryContact(false)
            newActuaryContactNameRef.current = null
        }
    }, [focusNewContact, focusNewActuaryContact])

    // TODO: refactor this into reusable component that is more understandable
    const showFieldErrors = (error?: FormError): boolean | undefined =>
        shouldValidate && Boolean(error)

    if (interimState || !draftSubmission || !updateDraft)
        return <ErrorOrLoadingPage state={interimState || 'GENERIC_ERROR'} />

    const stateContacts = draftSubmission.stateContacts

    const emptyStateContact = {
        name: '',
        titleRole: '',
        email: '',
    }

    if (stateContacts.length === 0) {
        stateContacts.push(emptyStateContact)
    }

    const contactsInitialValues: ContactsFormValues = {
        stateContacts: stateContacts,
    }

    // Handler for Contacts legends so that contacts show up as
    // State contacts 1 instead of State contacts 0 for first contact
    // and show (required) for only the first contact
    // Also handles the difference between State Contacts and Actuary Contacts
    const handleContactLegend = (index: number, contactText: string) => {
        const count = index + 1

        if (contactText === 'State') {
            return `State contacts ${count}`
        }

        if (contactText === 'Actuary') {
            return `Additional actuary contact ${index + 1}`
        }
    }

    const handleFormSubmit = async (
        values: ContactsFormValues,
        formikHelpers: FormikHelpers<ContactsFormValues>
    ) => {
        draftSubmission.stateContacts = values.stateContacts

        try {
            const updatedSubmission = await updateDraft(draftSubmission)
            if (updatedSubmission instanceof Error) {
                formikHelpers.setSubmitting(false)
                redirectToDashboard.current = false
                console.info(
                    'Error updating draft submission: ',
                    updatedSubmission
                )
            } else if (updatedSubmission) {
                if (redirectToDashboard.current) {
                    navigate(RoutesRecord.DASHBOARD_SUBMISSIONS)
                } else {
                    navigate(`../documents`)
                }
            }
        } catch (serverError) {
            formikHelpers.setSubmitting(false)
            redirectToDashboard.current = false
        }
    }

    const contactSchema = Yup.object().shape({
        stateContacts: Yup.array().of(
            Yup.object().shape({
                name: Yup.string().required('You must provide a name'),
                titleRole: Yup.string().required(
                    'You must provide a title/role'
                ),
                email: Yup.string()
                    .email('You must enter a valid email address')
                    .trim()
                    .required('You must provide an email address'),
            })
        ),
    })

    return (
        <>
            <div className={styles.stepIndicator}>
                <DynamicStepIndicator
                    formPages={activeFormPages(draftSubmission)}
                    currentFormPage={currentRoute}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={unlockInfo}
                    showPageErrorMessage={showPageErrorMessage ?? false}
                />
            </div>
            <FormContainer id="Contacts">
                <Formik
                    initialValues={contactsInitialValues}
                    onSubmit={handleFormSubmit}
                    validationSchema={contactSchema}
                >
                    {({
                        values,
                        errors,
                        dirty,
                        handleSubmit,
                        isSubmitting,
                    }) => (
                        <>
                            <UswdsForm
                                className={styles.formContainer}
                                id="ContactsForm"
                                aria-label="Contacts Form"
                                aria-describedby="form-guidance"
                                onSubmit={handleSubmit}
                            >
                                <SectionCard>
                                    <fieldset className="usa-fieldset with-sections">
                                        <h3>State contacts</h3>
                                        <p>
                                            Enter contact information for the
                                            state personnel you'd like to
                                            receive all CMS communication about
                                            this submission.
                                        </p>
                                        <legend className="srOnly">
                                            State contacts
                                        </legend>

                                        {shouldValidate && (
                                            <ErrorSummary
                                                errors={flattenErrors(errors)}
                                                headingRef={
                                                    errorSummaryHeadingRef
                                                }
                                            />
                                        )}

                                        <FieldArray name="stateContacts">
                                            {({
                                                remove,
                                                push,
                                            }: FieldArrayRenderProps) => (
                                                <div
                                                    className={
                                                        styles.stateContacts
                                                    }
                                                    data-testid="state-contacts"
                                                >
                                                    {values.stateContacts
                                                        .length > 0 &&
                                                        values.stateContacts.map(
                                                            (
                                                                _stateContact,
                                                                index
                                                            ) => (
                                                                <div
                                                                    className={
                                                                        styles.stateContact
                                                                    }
                                                                    key={index}
                                                                >
                                                                    <Fieldset
                                                                        legend={handleContactLegend(
                                                                            index,
                                                                            'State'
                                                                        )}
                                                                    >
                                                                        <span
                                                                            className={
                                                                                styles.requiredOptionalText
                                                                            }
                                                                        >
                                                                            Required
                                                                        </span>
                                                                        <FieldTextInput
                                                                            id={`stateContacts.${index}.name`}
                                                                            label="Name"
                                                                            name={`stateContacts.${index}.name`}
                                                                            aria-required={
                                                                                index ===
                                                                                0
                                                                            }
                                                                            showError={Boolean(
                                                                                showFieldErrors(
                                                                                    getIn(
                                                                                        errors,
                                                                                        `stateContacts.${index}.name`
                                                                                    )
                                                                                )
                                                                            )}
                                                                            type="text"
                                                                            inputRef={
                                                                                newStateContactNameRef
                                                                            }
                                                                            variant="SUBHEAD"
                                                                        />

                                                                        <FieldTextInput
                                                                            id={`stateContacts.${index}.titleRole`}
                                                                            label="Title/Role"
                                                                            name={`stateContacts.${index}.titleRole`}
                                                                            aria-required={
                                                                                index ===
                                                                                0
                                                                            }
                                                                            showError={Boolean(
                                                                                showFieldErrors(
                                                                                    getIn(
                                                                                        errors,
                                                                                        `stateContacts.${index}.titleRole`
                                                                                    )
                                                                                )
                                                                            )}
                                                                            type="text"
                                                                            variant="SUBHEAD"
                                                                        />

                                                                        <FieldTextInput
                                                                            id={`stateContacts.${index}.email`}
                                                                            label="Email"
                                                                            name={`stateContacts.${index}.email`}
                                                                            aria-required={
                                                                                index ===
                                                                                0
                                                                            }
                                                                            showError={Boolean(
                                                                                showFieldErrors(
                                                                                    getIn(
                                                                                        errors,
                                                                                        `stateContacts.${index}.email`
                                                                                    )
                                                                                )
                                                                            )}
                                                                            type="email"
                                                                            variant="SUBHEAD"
                                                                        />

                                                                        {index >
                                                                            0 && (
                                                                            <ButtonWithLogging
                                                                                type="button"
                                                                                unstyled
                                                                                parent_component_type="page body"
                                                                                className={
                                                                                    styles.removeContactBtn
                                                                                }
                                                                                onClick={() => {
                                                                                    remove(
                                                                                        index
                                                                                    )
                                                                                    setNewStateContactButtonFocus()
                                                                                }}
                                                                            >
                                                                                Remove
                                                                                contact
                                                                            </ButtonWithLogging>
                                                                        )}
                                                                    </Fieldset>
                                                                </div>
                                                            )
                                                        )}

                                                    <button
                                                        type="button"
                                                        className={`usa-button usa-button--outline ${styles.addContactBtn}`}
                                                        onClick={() => {
                                                            logButtonEvent({
                                                                text: 'Add another state contact',
                                                                button_style:
                                                                    'outline',
                                                                button_type:
                                                                    'button',
                                                                parent_component_type:
                                                                    'page body',
                                                            })
                                                            push(
                                                                emptyStateContact
                                                            )
                                                            setFocusNewContact(
                                                                true
                                                            )
                                                        }}
                                                        ref={
                                                            newStateContactButtonRef
                                                        }
                                                    >
                                                        Add another state
                                                        contact
                                                    </button>
                                                </div>
                                            )}
                                        </FieldArray>
                                    </fieldset>
                                </SectionCard>
                                <PageActions
                                    saveAsDraftOnClick={() => {
                                        if (!dirty) {
                                            navigate(
                                                RoutesRecord.DASHBOARD_SUBMISSIONS
                                            )
                                        } else {
                                            setShouldValidate(true)
                                            setFocusErrorSummaryHeading(true)
                                            redirectToDashboard.current = true
                                            handleSubmit()
                                        }
                                    }}
                                    backOnClick={() =>
                                        navigate(
                                            draftSubmission.submissionType ===
                                                'CONTRACT_ONLY'
                                                ? '../contract-details'
                                                : '../rate-details'
                                        )
                                    }
                                    continueOnClick={() => {
                                        redirectToDashboard.current = false
                                        setShouldValidate(true)
                                        setFocusErrorSummaryHeading(true)
                                    }}
                                    actionInProgress={isSubmitting}
                                    backOnClickUrl={
                                        draftSubmission.submissionType ===
                                        'CONTRACT_ONLY'
                                            ? generatePath(
                                                  RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS,
                                                  { id }
                                              )
                                            : generatePath(
                                                  RoutesRecord.SUBMISSIONS_RATE_DETAILS,
                                                  { id }
                                              )
                                    }
                                    saveAsDraftOnClickUrl={
                                        RoutesRecord.DASHBOARD_SUBMISSIONS
                                    }
                                    continueOnClickUrl="/edit/documents"
                                />
                            </UswdsForm>
                        </>
                    )}
                </Formik>
            </FormContainer>
        </>
    )
}
export { Contacts }
