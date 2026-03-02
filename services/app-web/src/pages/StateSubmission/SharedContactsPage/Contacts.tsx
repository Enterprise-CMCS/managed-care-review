import React, { useEffect, useState } from 'react'
import * as Yup from 'yup'
import { Form as UswdsForm, Fieldset } from '@trussworks/react-uswds'
import {
    Formik,
    FormikErrors,
    FieldArray,
    getIn,
    FieldArrayRenderProps,
} from 'formik'
import { useNavigate } from 'react-router-dom'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import styles from '../StateSubmissionForm.module.scss'
import { recordJSException } from '@mc-review/otel'
import {
    StateContact,
    UpdateContractDraftRevisionInput,
} from '../../../gen/gqlClient'

import { useFocus } from '../../../hooks'
import { activeFormPages, type ContractFormPageProps } from '../submissionUtils'
import { RouteT, EQRO_SUBMISSION_FORM_ROUTES } from '@mc-review/constants'
import {
    ButtonWithLogging,
    DynamicStepIndicator,
    FormNotificationContainer,
    SectionCard,
    FormContainer,
    ErrorSummary,
    FieldTextInput,
    PageActions,
} from '../../../components'
import { useCurrentRoute, useRouteParams, useTealium } from '../../../hooks'
import { useContractForm } from '../../../hooks/useContractForm'
import { useAuth } from '../../../contexts/AuthContext'
import { ErrorOrLoadingPage } from '../SharedSubmissionComponents'
import { PageBannerAlerts } from '../SharedSubmissionComponents'
import { useErrorSummary } from '../../../hooks/useErrorSummary'
import { featureFlags } from '@mc-review/common-code'
import { useFocusOnRender } from '../../../hooks/useFocusOnRender'
import { usePage } from '../../../contexts/PageContext'
import { getSubmissionPath } from '../../../routeHelpers'

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
}: ContractFormPageProps): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = useState(showValidations)
    const [draftSaved, setDraftSaved] = useState(false)
    useFocusOnRender(draftSaved, '[data-testid="saveAsDraftSuccessBanner"]')
    const [focusNewContact, setFocusNewContact] = useState(false)
    const [focusNewActuaryContact, setFocusNewActuaryContact] = useState(false)
    const ldClient = useLDClient()
    const { setFocusErrorSummaryHeading, errorSummaryHeadingRef } =
        useErrorSummary()
    const { logButtonEvent } = useTealium()

    const { loggedInUser } = useAuth()
    const { currentRoute } = useCurrentRoute()
    const { id } = useRouteParams()
    const { updateActiveMainContent } = usePage()
    const { draftSubmission, interimState, updateDraft, showPageErrorMessage } =
        useContractForm(id)
    const newStateContactNameRef = React.useRef<HTMLInputElement | null>(null) // This ref.current is reset to the newest contact name field each time new contact is added
    const [newStateContactButtonRef, setNewStateContactButtonFocus] = useFocus() // This ref.current is always the same element

    const newActuaryContactNameRef = React.useRef<HTMLInputElement | null>(null)

    const navigate = useNavigate()

    const hideSupportingDocs = ldClient?.variation(
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.flag,
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.defaultValue
    )

    /*
     Set focus to contact name field when adding new contacts.
     Clears ref and focusNewContact component state immediately after. The reset allows additional contacts to be added and preserves expected focus behavior.
    */
    useEffect(() => {
        if (focusNewContact) {
            if (newStateContactNameRef.current)
                newStateContactNameRef.current.focus()
            setFocusNewContact(false)
            newStateContactNameRef.current = null
        }
        if (focusNewActuaryContact) {
            if (newActuaryContactNameRef.current)
                newActuaryContactNameRef.current.focus()
            setFocusNewActuaryContact(false)
            newActuaryContactNameRef.current = null
        }
    }, [focusNewContact, focusNewActuaryContact])

    const activeMainContentId = 'contactsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    // TODO: refactor this into reusable component that is more understandable
    const showFieldErrors = (error?: FormError): boolean | undefined =>
        shouldValidate && Boolean(error)

    if (interimState || !draftSubmission || !updateDraft)
        return <ErrorOrLoadingPage state={interimState || 'GENERIC_ERROR'} />

    const isEQROSubmission = draftSubmission.contractSubmissionType === 'EQRO'
    const stateContacts = draftSubmission.draftRevision.formData.stateContacts
    const contractSubmissionType = draftSubmission.contractSubmissionType

    const emptyStateContact = {
        name: '',
        titleRole: '',
        email: '',
    }

    const contactsInitialValues: ContactsFormValues = {
        stateContacts:
            stateContacts.length === 0 ? [emptyStateContact] : stateContacts,
    }

    const handleFormSubmit = async (
        values: ContactsFormValues,
        setSubmitting: (isSubmitting: boolean) => void, // formik setSubmitting
        options: {
            type: 'SAVE_AS_DRAFT' | 'BACK' | 'CONTINUE'
            redirectPath?: RouteT
        }
    ) => {
        draftSubmission.draftRevision.formData.stateContacts =
            values.stateContacts
        const updatedFormData = draftSubmission.draftRevision.formData
        delete updatedFormData.__typename
        const updatedContractInput: UpdateContractDraftRevisionInput = {
            formData: draftSubmission.draftRevision.formData,
            contractID: draftSubmission.id,
            lastSeenUpdatedAt: draftSubmission.draftRevision.updatedAt,
        }

        if (options.type === 'SAVE_AS_DRAFT' && draftSaved) {
            setDraftSaved(false)
        }

        const updatedSubmission = await updateDraft(updatedContractInput)
        if (updatedSubmission instanceof Error) {
            setSubmitting(false)
            const msg = `Error updating draft submission: ${updatedSubmission}`
            console.info(msg)
            recordJSException(msg)
        } else if (options.type === 'SAVE_AS_DRAFT' && updatedSubmission) {
            setDraftSaved(true)
            setSubmitting(false)
        } else {
            if (isEQROSubmission) {
                navigate(
                    getSubmissionPath(
                        'SUBMISSIONS_REVIEW_SUBMIT',
                        contractSubmissionType,
                        id
                    )
                )
            } else if (hideSupportingDocs) {
                if (options.redirectPath) {
                    navigate(
                        getSubmissionPath(
                            options.redirectPath,
                            contractSubmissionType,
                            id
                        )
                    )
                }
            } else {
                navigate(
                    getSubmissionPath(
                        'SUBMISSIONS_DOCUMENTS',
                        contractSubmissionType,
                        id
                    )
                )
            }
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
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={
                        isEQROSubmission
                            ? EQRO_SUBMISSION_FORM_ROUTES
                            : activeFormPages(
                                  draftSubmission.draftRevision.formData,
                                  hideSupportingDocs
                              )
                    }
                    currentFormPage={currentRoute}
                    customPageTitles={
                        isEQROSubmission
                            ? {
                                  SUBMISSIONS_TYPE: 'Submission details',
                              }
                            : undefined
                    }
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={draftSubmission.draftRevision.unlockInfo}
                    showPageErrorMessage={showPageErrorMessage ?? false}
                    draftSaved={draftSaved}
                />
            </FormNotificationContainer>
            <FormContainer id="Contacts">
                <Formik
                    initialValues={contactsInitialValues}
                    onSubmit={(values, { setSubmitting }) => {
                        return handleFormSubmit(values, setSubmitting, {
                            type: 'CONTINUE',
                            redirectPath: 'SUBMISSIONS_REVIEW_SUBMIT',
                        })
                    }}
                    validationSchema={contactSchema}
                >
                    {({
                        values,
                        errors,
                        handleSubmit,
                        isSubmitting,
                        setSubmitting,
                    }) => (
                        <>
                            <UswdsForm
                                className={styles.formContainer}
                                id="ContactsForm"
                                onSubmit={handleSubmit}
                                noValidate
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
                                                                        legend={`State contacts ${index + 1}`}
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
                                    saveAsDraftOnClick={async () => {
                                        setFocusErrorSummaryHeading(true)
                                        await handleFormSubmit(
                                            values,
                                            setSubmitting,
                                            {
                                                type: 'SAVE_AS_DRAFT',
                                            }
                                        )
                                    }}
                                    backOnClick={() => {
                                        const previousPage =
                                            draftSubmission.draftRevision
                                                .formData.submissionType ===
                                            'CONTRACT_ONLY'
                                                ? 'SUBMISSIONS_CONTRACT_DETAILS'
                                                : 'SUBMISSIONS_RATE_DETAILS'

                                        navigate(
                                            getSubmissionPath(
                                                previousPage,
                                                contractSubmissionType,
                                                id
                                            )
                                        )
                                    }}
                                    continueOnClick={() => {
                                        setShouldValidate(true)
                                        setFocusErrorSummaryHeading(true)
                                    }}
                                    actionInProgress={isSubmitting}
                                    backOnClickUrl={
                                        draftSubmission.draftRevision.formData
                                            .submissionType === 'CONTRACT_ONLY'
                                            ? getSubmissionPath(
                                                  'SUBMISSIONS_CONTRACT_DETAILS',
                                                  contractSubmissionType,
                                                  id
                                              )
                                            : getSubmissionPath(
                                                  'SUBMISSIONS_RATE_DETAILS',
                                                  contractSubmissionType,
                                                  id
                                              )
                                    }
                                    continueOnClickUrl={getSubmissionPath(
                                        'SUBMISSIONS_REVIEW_SUBMIT',
                                        contractSubmissionType,
                                        id
                                    )}
                                />
                            </UswdsForm>
                        </>
                    )}
                </Formik>
            </FormContainer>
        </div>
    )
}
export { Contacts }
