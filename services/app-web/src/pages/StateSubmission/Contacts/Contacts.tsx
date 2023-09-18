import React, { useEffect } from 'react'
import * as Yup from 'yup'
import {
    Form as UswdsForm,
    FormGroup,
    Fieldset,
    Button,
} from '@trussworks/react-uswds'
import {
    Formik,
    FormikErrors,
    FormikHelpers,
    FieldArray,
    ErrorMessage,
    getIn,
    FieldArrayRenderProps,
} from 'formik'
import { useNavigate } from 'react-router-dom'

import styles from '../StateSubmissionForm.module.scss'

import {
    ActuaryCommunicationType,
    ActuaryContact,
    StateContact,
} from '../../../common-code/healthPlanFormDataType'

import {
    ErrorSummary,
    FieldRadio,
    FieldTextInput,
} from '../../../components/Form'

import { useFocus } from '../../../hooks/useFocus'
import { PageActions } from '../PageActions'
import type { HealthPlanFormPageProps } from '../StateSubmissionForm'
import { ActuaryContactFields } from './ActuaryContactFields'
import { RoutesRecord } from '../../../constants'

export interface ContactsFormValues {
    stateContacts: StateContact[]
    addtlActuaryContacts: ActuaryContact[]
    actuaryCommunicationPreference: ActuaryCommunicationType | undefined
}

const yupValidation = (submissionType: string) => {
    const contactShape = {
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
        addtlActuaryContacts: Yup.array(),
        actuaryCommunicationPreference: Yup.string().nullable(),
    }

    if (submissionType !== 'CONTRACT_ONLY') {
        contactShape.addtlActuaryContacts = Yup.array().of(
            Yup.object().shape({
                name: Yup.string().required('You must provide a name'),
                titleRole: Yup.string().required(
                    'You must provide a title/role'
                ),
                email: Yup.string()
                    .email('You must enter a valid email address')
                    .trim()
                    .required('You must provide an email address'),
                actuarialFirm: Yup.string()
                    .required('You must select an actuarial firm')
                    .nullable(),
                actuarialFirmOther: Yup.string()
                    .when('actuarialFirm', {
                        is: 'OTHER',
                        then: Yup.string()
                            .required('You must enter a description')
                            .nullable(),
                    })
                    .nullable(),
            })
        )
        contactShape.actuaryCommunicationPreference = Yup.string().required(
            'You must select a communication preference'
        )
    }

    return Yup.object().shape(contactShape)
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

    if (
        errors.addtlActuaryContacts &&
        Array.isArray(errors.addtlActuaryContacts)
    ) {
        errors.addtlActuaryContacts.forEach((contact, index) => {
            if (!contact) return

            Object.entries(contact).forEach(([field, value]) => {
                const errorKey = `addtlActuaryContacts.${index}.${field}`
                flattened[errorKey] = value
            })
        })

        if (errors.actuaryCommunicationPreference) {
            flattened['actuaryCommunicationPreference'] =
                errors.actuaryCommunicationPreference
        }
    }

    return flattened
}
export const Contacts = ({
    draftSubmission,
    showValidations = false,
    updateDraft,
}: {
    draftSubmission: HealthPlanFormPageProps['draftSubmission']
    showValidations?: HealthPlanFormPageProps['showValidations']
    updateDraft: HealthPlanFormPageProps['updateDraft']
}): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const [focusNewContact, setFocusNewContact] = React.useState(false)
    const [focusNewActuaryContact, setFocusNewActuaryContact] =
        React.useState(false)

    const redirectToDashboard = React.useRef(false)
    const newStateContactNameRef = React.useRef<HTMLInputElement | null>(null) // This ref.current is reset to the newest contact name field each time new contact is added
    const [newStateContactButtonRef, setNewStateContactButtonFocus] = useFocus() // This ref.current is always the same element

    const newActuaryContactNameRef = React.useRef<HTMLInputElement | null>(null)
    const [newActuaryContactButtonRef, setNewActuaryContactButtonFocus] =
        useFocus()

    const navigate = useNavigate()

    const errorSummaryHeadingRef = React.useRef<HTMLHeadingElement>(null)
    const [focusErrorSummaryHeading, setFocusErrorSummaryHeading] =
        React.useState(false)
    const includeActuaryContacts =
        draftSubmission.submissionType !== 'CONTRACT_ONLY'
    /*
     Set focus to contact name field when adding new contacts.
     Clears ref and focusNewContact component state immediately after. The reset allows additional contacts to be added and preserves expected focus behavior.
    */
    React.useEffect(() => {
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

    useEffect(() => {
        // Focus the error summary heading only if we are displaying
        // validation errors and the heading element exists
        if (focusErrorSummaryHeading && errorSummaryHeadingRef.current) {
            errorSummaryHeadingRef.current.focus()
        }
        setFocusErrorSummaryHeading(false)
    }, [focusErrorSummaryHeading])

    // TODO: refactor this into reusable component that is more understandable
    const showFieldErrors = (error?: FormError): boolean | undefined =>
        shouldValidate && Boolean(error)

    const stateContacts = draftSubmission.stateContacts
    const addtlActuaryContacts = draftSubmission.addtlActuaryContacts

    const emptyStateContact = {
        name: '',
        titleRole: '',
        email: '',
    }

    const emptyActuaryContact = {
        name: '',
        titleRole: '',
        email: '',
        actuarialFirm: undefined,
        actuarialFirmOther: '',
    }

    if (stateContacts.length === 0) {
        stateContacts.push(emptyStateContact)
    }

    const contactsInitialValues: ContactsFormValues = {
        stateContacts: stateContacts,
        addtlActuaryContacts: addtlActuaryContacts,
        actuaryCommunicationPreference:
            draftSubmission?.addtlActuaryCommunicationPreference ?? undefined,
    }

    // Handler for Contacts legends so that contacts show up as
    // State contacts 1 instead of State contacts 0 for first contact
    // and show (required) for only the first contact
    // Also handles the difference between State Contacts and Actuary Contacts
    const handleContactLegend = (index: number, contactText: string) => {
        const count = index + 1
        const required = index ? '' : ' (required)'

        if (contactText === 'State') {
            return `State contacts ${count} ${required}`
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
        if (includeActuaryContacts) {
            draftSubmission.addtlActuaryContacts = values.addtlActuaryContacts
            draftSubmission.addtlActuaryCommunicationPreference =
                values.actuaryCommunicationPreference
        }

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

    const contactSchema = yupValidation(draftSubmission.submissionType)

    return (
        <Formik
            initialValues={contactsInitialValues}
            onSubmit={handleFormSubmit}
            validationSchema={contactSchema}
        >
            {({ values, errors, dirty, handleSubmit, isSubmitting }) => (
                <>
                    <UswdsForm
                        className={styles.formContainer}
                        id="ContactsForm"
                        aria-label="Contacts Form"
                        aria-describedby="form-guidance"
                        onSubmit={handleSubmit}
                    >
                        <fieldset className="usa-fieldset">
                            <h3>State contacts</h3>
                            <p>
                                Enter contact information for the state
                                personnel you'd like to receive all CMS
                                communication about this submission.
                            </p>
                            <legend className="srOnly">State contacts</legend>
                            <span id="form-guidance">
                                A state contact is required
                            </span>

                            {shouldValidate && (
                                <ErrorSummary
                                    errors={flattenErrors(errors)}
                                    headingRef={errorSummaryHeadingRef}
                                />
                            )}

                            <FieldArray name="stateContacts">
                                {({ remove, push }: FieldArrayRenderProps) => (
                                    <div
                                        className={styles.stateContacts}
                                        data-testid="state-contacts"
                                    >
                                        {values.stateContacts.length > 0 &&
                                            values.stateContacts.map(
                                                (_stateContact, index) => (
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
                                                            <FieldTextInput
                                                                id={`stateContacts.${index}.name`}
                                                                label="Name"
                                                                name={`stateContacts.${index}.name`}
                                                                aria-required={
                                                                    index === 0
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
                                                                    index === 0
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
                                                                    index === 0
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
                                                                <Button
                                                                    type="button"
                                                                    unstyled
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
                                                                </Button>
                                                            )}
                                                        </Fieldset>
                                                    </div>
                                                )
                                            )}

                                        <button
                                            type="button"
                                            className={`usa-button usa-button--outline ${styles.addContactBtn}`}
                                            onClick={() => {
                                                push(emptyStateContact)
                                                setFocusNewContact(true)
                                            }}
                                            ref={newStateContactButtonRef}
                                        >
                                            Add another state contact
                                        </button>
                                    </div>
                                )}
                            </FieldArray>
                        </fieldset>

                        {includeActuaryContacts && (
                            <>
                                <fieldset className="usa-fieldset">
                                    <h3>Additional Actuary Contacts</h3>

                                    <p>
                                        Provide contact information for any
                                        additional actuaries who worked directly
                                        on this submission.
                                    </p>
                                    <legend className="srOnly">
                                        Actuary contacts
                                    </legend>

                                    <FieldArray name="addtlActuaryContacts">
                                        {({
                                            remove,
                                            push,
                                        }: FieldArrayRenderProps) => (
                                            <div
                                                className={
                                                    styles.actuaryContacts
                                                }
                                                data-testid="state-contacts"
                                            >
                                                {values.addtlActuaryContacts
                                                    .length > 0 &&
                                                    values.addtlActuaryContacts.map(
                                                        (
                                                            _actuaryContact,
                                                            index
                                                        ) => (
                                                            <div
                                                                className={
                                                                    styles.actuaryContact
                                                                }
                                                                key={index}
                                                                data-testid="actuary-contact"
                                                            >
                                                                <ActuaryContactFields
                                                                    actuaryContact={
                                                                        _actuaryContact
                                                                    }
                                                                    errors={
                                                                        errors
                                                                    }
                                                                    shouldValidate={
                                                                        shouldValidate
                                                                    }
                                                                    fieldNamePrefix={`addtlActuaryContacts.${index}`}
                                                                    fieldSetLegend={handleContactLegend(
                                                                        index,
                                                                        'Actuary'
                                                                    )}
                                                                    inputRef={
                                                                        newActuaryContactNameRef
                                                                    }
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    unstyled
                                                                    className={
                                                                        styles.removeContactBtn
                                                                    }
                                                                    onClick={() => {
                                                                        remove(
                                                                            index
                                                                        )
                                                                        setNewActuaryContactButtonFocus()
                                                                    }}
                                                                >
                                                                    Remove
                                                                    contact
                                                                </Button>
                                                            </div>
                                                        )
                                                    )}

                                                <button
                                                    type="button"
                                                    className={`usa-button usa-button--outline ${styles.addContactBtn}`}
                                                    onClick={() => {
                                                        push(
                                                            emptyActuaryContact
                                                        )
                                                        setFocusNewActuaryContact(
                                                            true
                                                        )
                                                    }}
                                                    ref={
                                                        newActuaryContactButtonRef
                                                    }
                                                >
                                                    Add actuary contact
                                                </button>
                                            </div>
                                        )}
                                    </FieldArray>
                                </fieldset>

                                <fieldset className="usa-fieldset">
                                    <h3>Actuaries' communication preference</h3>

                                    <legend className="srOnly">
                                        Actuarial communication preference
                                    </legend>
                                    <FormGroup
                                        error={showFieldErrors(
                                            errors.actuaryCommunicationPreference
                                        )}
                                    >
                                        <Fieldset
                                            className={styles.radioGroup}
                                            legend="Communication preference between CMS Office of the Actuary (OACT) and all state’s actuaries (i.e. certifying actuaries and additional actuary contacts)"
                                        >
                                            {showFieldErrors(`True`) && (
                                                <ErrorMessage
                                                    name={`actuaryCommunicationPreference`}
                                                    component="div"
                                                    className="usa-error-message"
                                                />
                                            )}
                                            <FieldRadio
                                                id="OACTtoActuary"
                                                name="actuaryCommunicationPreference"
                                                label={`OACT can communicate directly with the state’s actuaries but should copy the state on all written communication and all appointments for verbal discussions.`}
                                                value={'OACT_TO_ACTUARY'}
                                                aria-required
                                            />
                                            <FieldRadio
                                                id="OACTtoState"
                                                name="actuaryCommunicationPreference"
                                                label={`OACT can communicate directly with the state, and the state will relay all written communication to their actuaries and set up time for any potential verbal discussions.`}
                                                value={'OACT_TO_STATE'}
                                                aria-required
                                            />
                                        </Fieldset>
                                    </FormGroup>
                                </fieldset>
                            </>
                        )}

                        <PageActions
                            saveAsDraftOnClick={() => {
                                if (!dirty) {
                                    navigate(`/dashboard/submissions`)
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
                        />
                    </UswdsForm>
                </>
            )}
        </Formik>
    )
}
