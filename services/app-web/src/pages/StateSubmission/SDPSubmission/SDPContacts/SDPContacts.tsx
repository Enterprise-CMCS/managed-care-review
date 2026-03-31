import React, { useEffect, useState } from 'react'
import * as Yup from 'yup'
import { Form as UswdsForm, Fieldset } from '@trussworks/react-uswds'
import {
    FieldArray,
    FieldArrayRenderProps,
    Formik,
    FormikErrors,
    getIn,
} from 'formik'
import {
    ButtonWithLogging,
    DynamicStepIndicator,
    ErrorSummary,
    FieldTextInput,
    FormContainer,
    FormNotificationContainer,
    PageActions,
    SectionCard,
} from '../../../../components'
import styles from '../../StateSubmissionForm.module.scss'
import { useErrorSummary } from '../../../../hooks/useErrorSummary'
import { usePage } from '../../../../contexts/PageContext'
import { PageBannerAlerts } from '../../SharedSubmissionComponents'

export type SDPContactFormValue = {
    name: string
    titleRole: string
    email: string
}

export type SDPContactsFormValues = {
    stateContacts: SDPContactFormValue[]
}

type SDPContactsProps = {
    initialValues?: SDPContactsFormValues
    pageErrorMessage?: string | boolean
    onBack: () => void
    onContinue: (values: SDPContactsFormValues) => void | Promise<void>
}

type FormError =
    FormikErrors<SDPContactsFormValues>[keyof FormikErrors<SDPContactsFormValues>]

const emptyStateContact: SDPContactFormValue = {
    name: '',
    titleRole: '',
    email: '',
}

export const sdpContactsInitialValues: SDPContactsFormValues = {
    stateContacts: [emptyStateContact],
}

const flattenErrors = (
    errors: FormikErrors<SDPContactsFormValues>
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

const contactsSchema = Yup.object().shape({
    stateContacts: Yup.array().of(
        Yup.object().shape({
            name: Yup.string().required('You must provide a name'),
            titleRole: Yup.string().required('You must provide a title/role'),
            email: Yup.string()
                .email('You must enter a valid email address')
                .trim()
                .required('You must provide an email address'),
        })
    ),
})

export const SDPContacts = ({
    initialValues = sdpContactsInitialValues,
    pageErrorMessage = false,
    onBack,
    onContinue,
}: SDPContactsProps): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = useState(false)
    const { errorSummaryHeadingRef } = useErrorSummary()
    const { updateActiveMainContent } = usePage()
    const activeMainContentId = 'sdpContactsPageMainContent'
    const newStateContactNameRef = React.useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    const showFieldErrors = (error?: FormError): boolean | undefined =>
        shouldValidate && Boolean(error)

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={[
                        'SUBMISSIONS_TYPE',
                        'SUBMISSIONS_SDP_DETAILS',
                        'SUBMISSIONS_SDP_CONTACTS',
                        'SUBMISSIONS_SDP_REVIEW_SUBMIT',
                    ]}
                    currentFormPage="SUBMISSIONS_SDP_CONTACTS"
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                        SUBMISSIONS_SDP_DETAILS: 'SDP details',
                        SUBMISSIONS_SDP_CONTACTS: 'Contacts',
                        SUBMISSIONS_SDP_REVIEW_SUBMIT: 'Review and submit',
                    }}
                />
                <PageBannerAlerts showPageErrorMessage={pageErrorMessage} />
            </FormNotificationContainer>
            <FormContainer id="SDPContacts">
                <Formik
                    initialValues={initialValues}
                    onSubmit={async (values) => {
                        setShouldValidate(true)
                        await onContinue(values)
                    }}
                    validationSchema={contactsSchema}
                >
                    {({ values, errors, handleSubmit }) => (
                        <UswdsForm
                            className={styles.formContainer}
                            id="SDPContactsForm"
                            onSubmit={(e) => {
                                setShouldValidate(true)
                                return handleSubmit(e)
                            }}
                            noValidate
                        >
                            <SectionCard>
                                <fieldset className="usa-fieldset with-sections">
                                    <h3>State contacts</h3>
                                    <p>
                                        Enter contact information for the state
                                        personnel you'd like to receive all CMS
                                        communication about this submission.
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
                                                className={styles.stateContacts}
                                                data-testid="state-contacts"
                                            >
                                                {values.stateContacts.map(
                                                    (_contact, index) => (
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

                                                                {index > 0 && (
                                                                    <ButtonWithLogging
                                                                        type="button"
                                                                        unstyled
                                                                        parent_component_type="page body"
                                                                        className={
                                                                            styles.removeContactBtn
                                                                        }
                                                                        onClick={() =>
                                                                            remove(
                                                                                index
                                                                            )
                                                                        }
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
                                                    onClick={() =>
                                                        push(
                                                            emptyStateContact
                                                        )
                                                    }
                                                >
                                                    Add another state contact
                                                </button>
                                            </div>
                                        )}
                                    </FieldArray>
                                </fieldset>
                            </SectionCard>
                            <PageActions
                                backOnClick={onBack}
                                continueOnClick={() => {
                                    setShouldValidate(true)
                                }}
                            />
                        </UswdsForm>
                    )}
                </Formik>
            </FormContainer>
        </div>
    )
}
