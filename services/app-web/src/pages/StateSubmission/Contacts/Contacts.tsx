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
    Field,
    FieldArray,
    ErrorMessage,
} from 'formik'
import { useNavigate } from 'react-router-dom'

import styles from '../StateSubmissionForm.module.scss'

import {
    ActuaryContact,
    ActuarialFirmType,
    ActuaryCommunicationType,
} from '../../../common-code/healthPlanFormDataType'

import { ErrorSummary, FieldRadio } from '../../../components/Form'

import { useFocus } from '../../../hooks/useFocus'
import { PageActions } from '../PageActions'
import type { HealthPlanFormPageProps } from '../StateSubmissionForm'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../../common-code/featureFlags'
import { ActuaryContactFields } from './ActuaryContactFields'

export interface ContactsFormValues {
    stateContacts: stateContactValue[]
    actuaryContacts: actuaryContactValue[]
    actuaryCommunicationPreference: ActuaryCommunicationType | undefined
}

export interface stateContactValue {
    name: string
    titleRole: string
    email: string
}

export interface actuaryContactValue {
    name: string
    titleRole: string
    email: string
    actuarialFirm?: ActuarialFirmType | undefined
    actuarialFirmOther?: string | undefined
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
                    .required('You must provide an email address'),
            })
        ),
        actuaryContacts: Yup.array(),
        actuaryCommunicationPreference: Yup.string().nullable(),
    }

    if (submissionType !== 'CONTRACT_ONLY') {
        contactShape.actuaryContacts = Yup.array().of(
            Yup.object().shape({
                name: Yup.string().required('You must provide a name'),
                titleRole: Yup.string().required(
                    'You must provide a title/role'
                ),
                email: Yup.string()
                    .email('You must enter a valid email address')
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

// We want to make sure we are returning the specific error
// for a given field when we pass it through showFieldErrors
// so this makes sure we return the actual error and if its
// anything else we return undefined to not show it
const stateContactErrorHandling = (
    error: string | FormikErrors<stateContactValue> | undefined
): FormikErrors<stateContactValue> | undefined => {
    if (typeof error === 'string') {
        return undefined
    }
    return error
}

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

    if (errors.actuaryContacts && Array.isArray(errors.actuaryContacts)) {
        errors.actuaryContacts.forEach((contact, index) => {
            if (!contact) return

            Object.entries(contact).forEach(([field, value]) => {
                const errorKey = `actuaryContacts.${index}.${field}`
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
    // Launch Darkly
    const ldClient = useLDClient()
    const showMultiRates = ldClient?.variation(
        featureFlags.MULTI_RATE_SUBMISSIONS.flag,
        featureFlags.MULTI_RATE_SUBMISSIONS.defaultValue
    )

    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const [focusNewContact, setFocusNewContact] = React.useState(false)
    const [focusNewActuaryContact, setFocusNewActuaryContact] =
        React.useState(false)

    const redirectToDashboard = React.useRef(false)
    const newStateContactNameRef = React.useRef<HTMLElement | null>(null) // This ref.current is reset to the newest contact name field each time new contact is added
    const [newStateContactButtonRef, setNewStateContactButtonFocus] = useFocus() // This ref.current is always the same element

    const newActuaryContactNameRef = React.useRef<HTMLElement | null>(null)
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

    /**
     * Multi-rate-submissions flag off:
     * Certifying actuary is displayed and filled out on this page, so we need to display it along with additional actuaries
     * when flag is off.
     *
     * We do this by combining the certifying actuary of the first-rate certification with the actuaries in
     * addtlActuaryContacts into one array.
     */
    const combineActuaries = () => {
        if (draftSubmission.rateInfos[0]?.actuaryContacts.length) {
            const certifyingActuary: ActuaryContact =
                draftSubmission.rateInfos[0]?.actuaryContacts[0]
            return [certifyingActuary, ...draftSubmission.addtlActuaryContacts]
        }
        return []
    }

    const stateContacts = draftSubmission.stateContacts
    const actuaryContacts = showMultiRates
        ? draftSubmission.addtlActuaryContacts
        : combineActuaries()

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

    if (
        actuaryContacts.length === 0 &&
        includeActuaryContacts &&
        !showMultiRates
    ) {
        actuaryContacts.push(emptyActuaryContact)
    }

    const contactsInitialValues: ContactsFormValues = {
        stateContacts: stateContacts,
        actuaryContacts: actuaryContacts,
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
        } else if (contactText === 'Actuary') {
            if (!index && !showMultiRates)
                return `Certifying actuary ${required}`
            else
                return `Additional actuary contact ${
                    showMultiRates ? index + 1 : index
                }`
        }
    }

    const handleFormSubmit = async (
        values: ContactsFormValues,
        formikHelpers: FormikHelpers<ContactsFormValues>
    ) => {
        // const updatedDraft = updatesFromSubmission(draftSubmission)
        draftSubmission.stateContacts = values.stateContacts

        /**
         * Multi-rate-submissions flag off:
         * Certifying actuary is on this page along with additional actuaries in one array, values.actuaryContacts from
         * formik. In v2 of the protobuf, it was directly saved into the first-rate certification actuaryContacts field.
         * So we need to now save this data that conforms to v3 of the protobuf where certifying actuary is saved to each
         * rate certification data and the additional actuaries to on the top level in addtlActuaryContacts.
         *
         * We can do that by saving the first actuary (the certifying actuary) in values.actuaryContacts value from
         * formik, to the first-rate certifications actuaryContacts at index 0, which is the first actuary contact. Then
         * we save the rest of the actuary contacts in values.actuaryContacts to the addtlActuaryContacts field
         */
        if (showMultiRates && includeActuaryContacts) {
            draftSubmission.addtlActuaryContacts = values.actuaryContacts
            draftSubmission.addtlActuaryCommunicationPreference =
                values.actuaryCommunicationPreference
        } else if (includeActuaryContacts) {
            draftSubmission.rateInfos[0].actuaryContacts.splice(
                0,
                1,
                values.actuaryContacts[0]
            )
            draftSubmission.addtlActuaryContacts =
                values.actuaryContacts.splice(1)
            draftSubmission.addtlActuaryCommunicationPreference =
                values.actuaryCommunicationPreference
        }

        try {
            const updatedSubmission = await updateDraft(draftSubmission)
            if (updatedSubmission instanceof Error) {
                formikHelpers.setSubmitting(false)
                redirectToDashboard.current = false
                console.log(
                    'Error updating draft submission: ',
                    updatedSubmission
                )
            } else if (updatedSubmission) {
                if (redirectToDashboard.current) {
                    navigate(`/dashboard`)
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
        <>
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
                                <legend className="srOnly">
                                    State contacts
                                </legend>
                                <span id="form-guidance">
                                    {includeActuaryContacts && !showMultiRates
                                        ? 'A state and an actuary contact are required'
                                        : 'A state contact is required'}
                                </span>

                                {shouldValidate && (
                                    <ErrorSummary
                                        errors={flattenErrors(errors)}
                                        headingRef={errorSummaryHeadingRef}
                                    />
                                )}

                                <FieldArray name="stateContacts">
                                    {({ remove, push }) => (
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
                                                                <FormGroup
                                                                    error={showFieldErrors(
                                                                        stateContactErrorHandling(
                                                                            errors
                                                                                ?.stateContacts?.[
                                                                                index
                                                                            ]
                                                                        )?.name
                                                                    )}
                                                                >
                                                                    <label
                                                                        htmlFor={`stateContacts.${index}.name`}
                                                                    >
                                                                        Name
                                                                    </label>
                                                                    {showFieldErrors(
                                                                        `True`
                                                                    ) && (
                                                                        <ErrorMessage
                                                                            name={`stateContacts.${index}.name`}
                                                                            component="div"
                                                                            className="usa-error-message"
                                                                        />
                                                                    )}
                                                                    <Field
                                                                        name={`stateContacts.${index}.name`}
                                                                        id={`stateContacts.${index}.name`}
                                                                        aria-required={
                                                                            index ===
                                                                            0
                                                                        }
                                                                        type="text"
                                                                        className="usa-input"
                                                                        innerRef={(
                                                                            el: HTMLElement
                                                                        ) =>
                                                                            (newStateContactNameRef.current =
                                                                                el)
                                                                        }
                                                                    />
                                                                </FormGroup>

                                                                <FormGroup
                                                                    error={showFieldErrors(
                                                                        stateContactErrorHandling(
                                                                            errors
                                                                                ?.stateContacts?.[
                                                                                index
                                                                            ]
                                                                        )
                                                                            ?.titleRole
                                                                    )}
                                                                >
                                                                    <label
                                                                        htmlFor={`stateContacts.${index}.titleRole`}
                                                                    >
                                                                        Title/Role
                                                                    </label>
                                                                    {showFieldErrors(
                                                                        `True`
                                                                    ) && (
                                                                        <ErrorMessage
                                                                            name={`stateContacts.${index}.titleRole`}
                                                                            component="div"
                                                                            className="usa-error-message"
                                                                        />
                                                                    )}
                                                                    <Field
                                                                        name={`stateContacts.${index}.titleRole`}
                                                                        id={`stateContacts.${index}.titleRole`}
                                                                        aria-required={
                                                                            index ===
                                                                            0
                                                                        }
                                                                        type="text"
                                                                        className="usa-input"
                                                                    />
                                                                </FormGroup>

                                                                <FormGroup
                                                                    error={showFieldErrors(
                                                                        stateContactErrorHandling(
                                                                            errors
                                                                                ?.stateContacts?.[
                                                                                index
                                                                            ]
                                                                        )?.email
                                                                    )}
                                                                >
                                                                    <label
                                                                        htmlFor={`stateContacts.${index}.email`}
                                                                    >
                                                                        Email
                                                                    </label>
                                                                    {showFieldErrors(
                                                                        `True`
                                                                    ) && (
                                                                        <ErrorMessage
                                                                            name={`stateContacts.${index}.email`}
                                                                            component="div"
                                                                            className="usa-error-message"
                                                                        />
                                                                    )}
                                                                    <Field
                                                                        name={`stateContacts.${index}.email`}
                                                                        id={`stateContacts.${index}.email`}
                                                                        aria-required={
                                                                            index ===
                                                                            0
                                                                        }
                                                                        type="text"
                                                                        className="usa-input"
                                                                    />
                                                                </FormGroup>

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
                                        <h3>
                                            {showMultiRates
                                                ? 'Additional Actuary Contacts'
                                                : 'Actuary contacts'}
                                        </h3>

                                        <p>
                                            {showMultiRates
                                                ? 'Provide contact information for any additional actuaries who worked directly on this submission.'
                                                : 'Provide contact information for the actuaries who worked directly on this submission.'}
                                        </p>
                                        <legend className="srOnly">
                                            Actuary contacts
                                        </legend>

                                        <FieldArray name="actuaryContacts">
                                            {({ remove, push }) => (
                                                <div
                                                    className={
                                                        styles.actuaryContacts
                                                    }
                                                    data-testid="state-contacts"
                                                >
                                                    {values.actuaryContacts
                                                        .length > 0 &&
                                                        values.actuaryContacts.map(
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
                                                                        fieldNamePrefix={`actuaryContacts.${index}`}
                                                                        fieldSetLegend={handleContactLegend(
                                                                            index,
                                                                            'Actuary'
                                                                        )}
                                                                        innerRef={(
                                                                            el: HTMLElement
                                                                        ) =>
                                                                            (newActuaryContactNameRef.current =
                                                                                el)
                                                                        }
                                                                    />
                                                                    {(index >
                                                                        0 ||
                                                                        showMultiRates) && (
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
                                                                    )}
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
                                                        {showMultiRates
                                                            ? `Add actuary contact`
                                                            : `Add another actuary contact`}
                                                    </button>
                                                </div>
                                            )}
                                        </FieldArray>

                                        {!showMultiRates && (
                                            <>
                                                <legend className="srOnly">
                                                    Actuarial communication
                                                    preference
                                                </legend>
                                                <FormGroup
                                                    error={showFieldErrors(
                                                        errors.actuaryCommunicationPreference
                                                    )}
                                                >
                                                    <Fieldset
                                                        className={
                                                            styles.radioGroup
                                                        }
                                                        legend="Communication preference between CMS Office of the Actuary (OACT) and the state’s actuary"
                                                    >
                                                        {showFieldErrors(
                                                            `True`
                                                        ) && (
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
                                                            value={
                                                                'OACT_TO_ACTUARY'
                                                            }
                                                            aria-required
                                                        />
                                                        <FieldRadio
                                                            id="OACTtoState"
                                                            name="actuaryCommunicationPreference"
                                                            label={`OACT can communicate directly with the state, and the state will relay all written communication to their actuaries and set up time for any potential verbal discussions.`}
                                                            value={
                                                                'OACT_TO_STATE'
                                                            }
                                                            aria-required
                                                        />
                                                    </Fieldset>
                                                </FormGroup>
                                            </>
                                        )}
                                    </fieldset>

                                    {showMultiRates && (
                                        <fieldset className="usa-fieldset">
                                            <h3>
                                                Actuaries' communication
                                                preference
                                            </h3>

                                            <legend className="srOnly">
                                                Actuarial communication
                                                preference
                                            </legend>
                                            <FormGroup
                                                error={showFieldErrors(
                                                    errors.actuaryCommunicationPreference
                                                )}
                                            >
                                                <Fieldset
                                                    className={
                                                        styles.radioGroup
                                                    }
                                                    legend="Communication preference between CMS Office of the Actuary (OACT) and all state’s actuaries (i.e. certifying actuaries and additional actuary contacts)"
                                                >
                                                    {showFieldErrors(
                                                        `True`
                                                    ) && (
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
                                                        value={
                                                            'OACT_TO_ACTUARY'
                                                        }
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
                                    )}
                                </>
                            )}

                            <PageActions
                                saveAsDraftOnClick={() => {
                                    if (!dirty) {
                                        navigate(`/dashboard`)
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
        </>
    )
}
