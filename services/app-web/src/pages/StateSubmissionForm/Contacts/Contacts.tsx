import React from 'react'
import * as Yup from 'yup'
import {
    Form as UswdsForm,
    FormGroup,
    Fieldset,
    Button,
    Link,
    ButtonGroup,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors, FormikHelpers, Field, FieldArray, ErrorMessage } from 'formik'
import { NavLink, useHistory } from 'react-router-dom'

import styles from '../StateSubmissionForm.module.scss'

import {
    ActuarialFirmType,
    DraftSubmission,
    UpdateDraftSubmissionInput,
} from '../../../gen/gqlClient'

import { FieldRadio } from '../../../components/Form/FieldRadio/FieldRadio'

import { updatesFromSubmission, stripTypename } from '../updateSubmissionTransform'
import { MCRouterState } from '../../../constants/routerState'

export interface ContactsFormValues {
    stateContacts: stateContactValue[]
    actuaryContacts: actuaryContactValue[]
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
    actuarialFirm?: ActuarialFirmType | null | undefined
}

const ContactSchema = Yup.object().shape({
    stateContacts: Yup.array()
        .of(Yup.object().shape({
            name: Yup.string()
                .required('You must provide a name'),
            titleRole: Yup.string()
                .required('You must provide a title/role'),
            email: Yup.string()
                .email('You must enter a valid email address')
                .required('You must provide an email address'),
        })),
    actuaryContacts: Yup.array()
        .of(Yup.object().shape({
            name: Yup.string()
                .required('You must provide a name'),
            titleRole: Yup.string()
                .required('You must provide a title/role'),
            email: Yup.string()
                .email('You must enter a valid email address')
                .required('You must provide an email address'),
            actuarialFirm: Yup.string()
                .required('You must select an actuarial firm')
                .nullable()
        }))
})

type FormError = FormikErrors<ContactsFormValues>[keyof FormikErrors<ContactsFormValues>]

// We want to make sure we are returning the specific error
// for a given field when we pass it through showFieldErrors
// so this makes sure we return the actual error and if its
// anything else we return undefined to not show it
const stateContactErrorHandling = (error: string | FormikErrors<stateContactValue> | undefined) : FormikErrors<stateContactValue> | undefined => {

    if (typeof(error) === 'string') {
        return undefined
    }
    return (
      error
    )
}

const actuaryContactErrorHandling = (error: string | FormikErrors<actuaryContactValue> | undefined) : FormikErrors<actuaryContactValue> | undefined => {

    if (typeof(error) === 'string') {
        return undefined
    }
    return (
      error
    )
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

    // TODO: refactor this into reusable component that is more understandable
    const showFieldErrors = (error?: FormError) : boolean | undefined =>
        shouldValidate && Boolean(error)

    const stateContacts = stripTypename(draftSubmission.stateContacts)
    const actuaryContacts = stripTypename(draftSubmission.actuaryContacts)

    const emptyStateContact = {
        name: '',
        titleRole: '',
        email: '',
    }

    const emptyActuaryContact = {
        name: '',
        titleRole: '',
        email: '',
        actuarialFirm: null,
    }

    if (stateContacts.length === 0) {
        stateContacts.push(emptyStateContact)
    }

    if (actuaryContacts.length === 0) {
        actuaryContacts.push(emptyActuaryContact)
    }

    const contactsInitialValues: ContactsFormValues = {
      stateContacts: stateContacts,
      actuaryContacts: actuaryContacts,
    }

    // Handler for Contacts legends so that contacts show up as
    // State contacts 1 instead of State contacts 0 for first contact
    // and show (required) for only the first contact
    // Also handles the difference between State Contacts and Actuary Contacts
    const handleContactLegend = (index: number, contactText: string) => {
        const count = index + 1
        const required = index ? '' : ' (required)'

        if (contactText === 'State') {
            return (
                `State contacts ${count} ${required}`
            )
        }
        else if (contactText === 'Actuary') {
            if (!index)
                return `Certifying actuary ${required}`
            else
                return `Additional actuary contact`
        }
    }

    const handleFormSubmit = async (
        values: ContactsFormValues,
        formikHelpers: FormikHelpers<ContactsFormValues>
    ) => {
        const updatedDraft = updatesFromSubmission(draftSubmission)
        updatedDraft.stateContacts = values.stateContacts
        updatedDraft.actuaryContacts = values.actuaryContacts

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
                validationSchema={ContactSchema}
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
                                {formAlert && formAlert}
                                <p>Provide contact information for the state personnel you'd like to recieve all CMS communication about this submission.</p>
                                <legend className="srOnly">State contacts</legend>
                                {formAlert && formAlert}

                                <FieldArray name="stateContacts">
                                {({ remove, push }) => (
                                    <div className={styles.stateContacts} data-testid="state-contacts">
                                        {values.stateContacts.length > 0 &&
                                          values.stateContacts.map((stateContact, index) => (
                                              <div className={styles.stateContact} key={index}>
                                                  <Fieldset legend={handleContactLegend(index, 'State')}>

                                                  <FormGroup
                                                    error={showFieldErrors(stateContactErrorHandling(errors?.stateContacts?.[index])?.name)}
                                                  >
                                                      <label htmlFor={`stateContacts.${index}.name`}>
                                                          Name
                                                      </label>
                                                      {showFieldErrors(`True`) && (
                                                        <ErrorMessage
                                                            name={`stateContacts.${index}.name`}
                                                            component="div"
                                                            className="usa-error-message"
                                                        />
                                                      )}
                                                      <Field
                                                        name={`stateContacts.${index}.name`}
                                                        id={`stateContacts.${index}.name`}
                                                        type="text"
                                                        className="usa-input"
                                                      />
                                                  </FormGroup>

                                                  <FormGroup
                                                  error={showFieldErrors(stateContactErrorHandling(errors?.stateContacts?.[index])?.titleRole)}
                                                  >
                                                      <label htmlFor={`stateContacts.${index}.titleRole`}>
                                                          Title/Role
                                                      </label>
                                                      {showFieldErrors(`True`) && (
                                                        <ErrorMessage
                                                            name={`stateContacts.${index}.titleRole`}
                                                            component="div"
                                                            className="usa-error-message"
                                                        />
                                                      )}
                                                      <Field
                                                        name={`stateContacts.${index}.titleRole`}
                                                        id={`stateContacts.${index}.titleRole`}
                                                        type="text"
                                                        className="usa-input"
                                                      />
                                                  </FormGroup>

                                                  <FormGroup
                                                  error={showFieldErrors(stateContactErrorHandling(errors?.stateContacts?.[index])?.email)}
                                                  >
                                                      <label htmlFor={`stateContacts.${index}.email`}>
                                                          Email
                                                      </label>
                                                      {showFieldErrors(`True`) && (
                                                        <ErrorMessage
                                                            name={`stateContacts.${index}.email`}
                                                            component="div"
                                                            className="usa-error-message"
                                                        />
                                                      )}
                                                      <Field
                                                        name={`stateContacts.${index}.email`}
                                                        id={`stateContacts.${index}.email`}
                                                        type="text"
                                                        className="usa-input"
                                                      />
                                                </FormGroup>

                                                {index > 0 && (
                                                <Button
                                                  type="button"
                                                  unstyled
                                                  className={styles.removeContactBtn}
                                                  onClick={() => (remove(index))}
                                                >
                                                    Remove contact
                                                </Button>
                                                )}
                                                </Fieldset>
                                            </div>
                                        ))}

                                        <Button
                                          type="button"
                                          outline
                                          className={styles.addContactBtn}
                                          onClick={() => push(emptyStateContact)}
                                        >
                                        Add state contact
                                        </Button>
                                    </div>
                                )}
                                </FieldArray>

                            </fieldset>

                            {draftSubmission.submissionType !==
                            'CONTRACT_ONLY' && (

                              <fieldset className="usa-fieldset">
                                  <h3>Actuary contacts</h3>
                                  {formAlert && formAlert}
                                  <p>Provide contact information for the actuaries who worked directly on this submission.</p>
                                  <legend className="srOnly">Actuary contacts</legend>
                                  {formAlert && formAlert}

                                  <FieldArray name="actuaryContacts">
                                  {({ remove, push }) => (
                                      <div className={styles.actuaryContacts} data-testid="state-contacts">
                                          {values.actuaryContacts.length > 0 &&
                                            values.actuaryContacts.map((actuaryContact, index) => (
                                                <div className={styles.actuaryContact} key={index}>
                                                    <Fieldset legend={handleContactLegend(index, 'Actuary')}>

                                                    <FormGroup
                                                      error={showFieldErrors(actuaryContactErrorHandling(errors?.actuaryContacts?.[index])?.name)}
                                                    >
                                                        <label htmlFor={`actuaryContacts.${index}.name`}>
                                                            Name
                                                        </label>
                                                        {showFieldErrors(`True`) && (
                                                          <ErrorMessage
                                                              name={`actuaryContacts.${index}.name`}
                                                              component="div"
                                                              className="usa-error-message"
                                                          />
                                                        )}
                                                        <Field
                                                          name={`actuaryContacts.${index}.name`}
                                                          id={`actuaryContacts.${index}.name`}
                                                          type="text"
                                                          className="usa-input"
                                                        />
                                                    </FormGroup>

                                                    <FormGroup
                                                    error={showFieldErrors(actuaryContactErrorHandling(errors?.stateContacts?.[index])?.titleRole)}
                                                    >
                                                        <label htmlFor={`actuaryContacts.${index}.titleRole`}>
                                                            Title/Role
                                                        </label>
                                                        {showFieldErrors(`True`) && (
                                                          <ErrorMessage
                                                              name={`actuaryContacts.${index}.titleRole`}
                                                              component="div"
                                                              className="usa-error-message"
                                                          />
                                                        )}
                                                        <Field
                                                          name={`actuaryContacts.${index}.titleRole`}
                                                          id={`actuaryContacts.${index}.titleRole`}
                                                          type="text"
                                                          className="usa-input"
                                                        />
                                                    </FormGroup>

                                                    <FormGroup
                                                    error={showFieldErrors(actuaryContactErrorHandling(errors?.actuaryContacts?.[index])?.email)}
                                                    >
                                                        <label htmlFor={`actuaryContacts.${index}.email`}>
                                                            Email
                                                        </label>
                                                        {showFieldErrors(`True`) && (
                                                          <ErrorMessage
                                                              name={`actuaryContacts.${index}.email`}
                                                              component="div"
                                                              className="usa-error-message"
                                                          />
                                                        )}
                                                        <Field
                                                          name={`actuaryContacts.${index}.email`}
                                                          id={`actuaryContacts.${index}.email`}
                                                          type="text"
                                                          className="usa-input"
                                                        />
                                                  </FormGroup>

                                                  <label htmlFor={`actuaryContacts.${index}.actuarialFirm`}>
                                                      Actuarial firm
                                                  </label>
                                                  {showFieldErrors(`True`) && (
                                                    <ErrorMessage
                                                        name={`actuaryContacts.${index}.actuarialFirm`}
                                                        component="div"
                                                        className="usa-error-message"
                                                    />
                                                  )}
                                                  <FieldRadio
                                                      id={`mercer-${index}`}
                                                      name={`actuaryContacts.${index}.actuarialFirm`}
                                                      label="Mercer"
                                                      value={'MERCER'}
                                                      checked={values.actuaryContacts[index].actuarialFirm === 'MERCER'}
                                                      aria-required
                                                  />
                                                  {/*
                                                    checked={values.actuaryContacts[index].actuarialFirm === 'MERCER'}
                                                    */}
                                                  <FieldRadio
                                                      id={`milliman-${index}`}
                                                      name={`actuaryContacts.${index}.actuarialFirm`}
                                                      label="Milliman"
                                                      value={'MILLIMAN'}
                                                      checked={values.actuaryContacts[index].actuarialFirm === 'MILLIMAN'}
                                                      aria-required
                                                  />
                                                  <FieldRadio
                                                      id={`optumas-${index}`}
                                                      name={`actuaryContacts.${index}.actuarialFirm`}
                                                      label="Optumas"
                                                      value={'OPTUMAS'}
                                                      checked={values.actuaryContacts[index].actuarialFirm === 'OPTUMAS'}
                                                      aria-required
                                                  />
                                                  <FieldRadio
                                                      id={`guidehouse-${index}`}
                                                      name={`actuaryContacts.${index}.actuarialFirm`}
                                                      label="Guidehouse"
                                                      value={'GUIDEHOUSE'}
                                                      aria-required
                                                  />
                                                  <FieldRadio
                                                      id={`deloitte-${index}`}
                                                      name={`actuaryContacts.${index}.actuarialFirm`}
                                                      label="Deloitte"
                                                      value={'DELOITTE'}
                                                      checked={values.actuaryContacts[index].actuarialFirm === 'DELOITTE'}
                                                      aria-required
                                                  />
                                                  <FieldRadio
                                                      id={`stateInHouse-${index}`}
                                                      name={`actuaryContacts.${index}.actuarialFirm`}
                                                      label="State in-house"
                                                      value={'STATE_IN_HOUSE'}
                                                      checked={values.actuaryContacts[index].actuarialFirm === 'STATE_IN_HOUSE'}
                                                      aria-required
                                                  />
                                                  <FieldRadio
                                                      id={`other-${index}`}
                                                      name={`actuaryContacts.${index}.actuarialFirm`}
                                                      label="Other"
                                                      value={'OTHER'}
                                                      checked={values.actuaryContacts[index].actuarialFirm === 'OTHER'}
                                                      aria-required
                                                  />

                                                  {index > 0 && (
                                                  <Button
                                                    type="button"
                                                    unstyled
                                                    className={styles.removeContactBtn}
                                                    onClick={() => (remove(index))}
                                                  >
                                                      Remove contact
                                                  </Button>
                                                  )}
                                                  </Fieldset>
                                              </div>
                                          ))}

                                          <Button
                                            type="button"
                                            outline
                                            className={styles.addContactBtn}
                                            onClick={() => push(emptyActuaryContact)}
                                          >
                                          Add actuary contact
                                          </Button>
                                      </div>
                                  )}
                                  </FieldArray>

                                </fieldset>
                            )}

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
                                        to={draftSubmission.submissionType ===
                                        'CONTRACT_ONLY'
                                            ? 'contract-details'
                                            : 'rate-details'}
                                    >
                                        Back
                                    </Link>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        onClick={() => {
                                          console.log(values)
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
