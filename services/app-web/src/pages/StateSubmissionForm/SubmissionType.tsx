import React from 'react'
import * as Yup from 'yup'
import {
    Alert,
    Button,
    ButtonGroup,
    ErrorMessage,
    Form as UswdsForm,
    Fieldset,
    Radio,
    FormGroup,
    Dropdown,
    Link,
    Label,
    Textarea,
} from '@trussworks/react-uswds'
import { Field, Formik, FormikHelpers, FormikErrors } from 'formik'
import { NavLink, useHistory } from 'react-router-dom'
import PageHeading from '../../components/PageHeading'
import { useMutation } from '@apollo/client'

import styles from './StateSubmissionForm.module.scss'
import {
    CreateDraftSubmissionDocument,
    DraftSubmission,
    SubmissionType as SubmissionTypeT,
} from '../../gen/gqlClient'
import { useAuth } from '../../contexts/AuthContext'
import { SubmissionTypeRecord } from '../../constants/submissions'
import { usePage } from '../../contexts/PageContext'
// Formik setup
const SubmissionTypeFormSchema = Yup.object().shape({
    program: Yup.string(),
    submissionDescription: Yup.string().required(
        'You must provide a description of any major changes or updates'
    ),
    submissionType: Yup.string().required('You must choose a submission type'),
})
export interface SubmissionTypeFormValues {
    programId: string
    submissionDescription: string
    submissionType: string
}
type SubmissionTypeProps = {
    showValidations?: boolean
    draftSubmission?: DraftSubmission
}

type FormError = FormikErrors<SubmissionTypeFormValues>[keyof FormikErrors<SubmissionTypeFormValues>]
export const SubmissionType = ({
    showValidations = false,
    draftSubmission = undefined,
}: SubmissionTypeProps): React.ReactElement => {
    const [showFormAlert, setShowFormAlert] = React.useState(false)
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const { updateHeading } = usePage()
    const { loggedInUser: { state: { programs = [] } = {} } = {} } = useAuth()

    const history = useHistory()
    const location = history.location
    const isNewSubmission = location.pathname === '/submissions/new'

    const [createDraftSubmission, { data, error }] = useMutation(
        CreateDraftSubmissionDocument
    )

    if (error) {
        setShowFormAlert(true)
        console.log('Log: creating new submission failed with gql error', error)
    }

    // TODO: remove in favor of handling this at the StateSubmissionForm level
    React.useEffect(() => {
        const submissionName =
            data && data.createDraftSubmission.draftSubmission.name
        if (submissionName) {
            updateHeading(submissionName)
        }
    }, [data, updateHeading])

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)


    const submissionTypeInitialValues: SubmissionTypeFormValues = {
        programId: draftSubmission?.program.id ?? programs[0]?.id, // TODO: change this to be the program selected on the tab
        submissionDescription: draftSubmission?.submissionDescription ?? '',
        submissionType: draftSubmission?.submissionType ?? '',
    }

    const handleFormSubmit = async (
        values: SubmissionTypeFormValues,
        formikHelpers: FormikHelpers<SubmissionTypeFormValues>
    ) => {
        if (isNewSubmission) {
            try {
                const result = await createDraftSubmission({
                    variables: { input: values },
                })

                const draftSubmission: DraftSubmission =
                    result.data.createDraftSubmission.draftSubmission

                if (draftSubmission) {
                    history.push(
                        `/submissions/${draftSubmission.id}/contract-details`
                    )
                }
            } catch (serverError) {
                setShowFormAlert(true)
                formikHelpers.setSubmitting(false) // unblock submit button to allow resubmit
                console.log(
                    'Log: creating new submission failed with server error',
                    serverError
                )
            }
        } else {
            // TODO: implement saving an existing submission
            console.log('mock save draft submission', values)
        }
    }

    return (
        <Formik
            initialValues={submissionTypeInitialValues}
            onSubmit={handleFormSubmit}
            validationSchema={SubmissionTypeFormSchema}
            validateOnChange={shouldValidate}
            validateOnBlur={shouldValidate}
        >
            {({
                values,
                errors,
                handleChange,
                handleSubmit,
                isSubmitting,
                isValidating,
                validateForm,
            }) => (
                <>
                    <UswdsForm
                        className="usa-form--large"
                        id="SubmissionTypeForm"
                        aria-label="New Submission Form"
                        onSubmit={(e) => {
                            e.preventDefault()
                            validateForm()
                                .then(() => {
                                    setShouldValidate(true)
                                })
                                .catch(() =>
                                    console.warn('Log: Validation Error')
                                )

                            if (!isValidating) handleSubmit()
                        }}
                    >
                        <fieldset className="usa-fieldset">
                            <legend className={styles.formHeader}>
                                <PageHeading headingLevel="h2">
                                    Submission type
                                </PageHeading>
                            </legend>
                            {showFormAlert && (
                                <Alert type="error">Something went wrong</Alert>
                            )}
                            <div className={styles.formContainer}>
                                <span>All fields are required</span>
                                <FormGroup className={styles.formGroup}>
                                    <Label htmlFor="programId">Program</Label>
                                    <Field
                                        id="programId"
                                        name="programId"
                                        as={Dropdown}
                                        onChange={handleChange}
                                        value={values.programId}
                                    >
                                        {programs.map((program) => (
                                            <option
                                                key={program.id}
                                                value={program.id}
                                            >
                                                {program.name}
                                            </option>
                                        ))}
                                    </Field>
                                </FormGroup>

                                <FormGroup className={styles.formGroup}>
                                    <Fieldset legend="Choose submission type">
                                        {showFieldErrors(
                                            errors.submissionType
                                        ) && (
                                            <ErrorMessage>
                                                {errors.submissionType}
                                            </ErrorMessage>
                                        )}
                                        <Field
                                            as={Radio}
                                            aria-required
                                            checked={
                                                values.submissionType ===
                                                SubmissionTypeT.ContractOnly
                                            }
                                            id="contractOnly"
                                            name="submissionType"
                                            label={
                                                SubmissionTypeRecord[
                                                    SubmissionTypeT.ContractOnly
                                                ]
                                            }
                                            value={SubmissionTypeT.ContractOnly}
                                        />
                                        <Field
                                            as={Radio}
                                            aria-required
                                            checked={
                                                values.submissionType ===
                                                SubmissionTypeT.ContractAndRates
                                            }
                                            id="contractRate"
                                            name="submissionType"
                                            label={
                                                SubmissionTypeRecord[
                                                    SubmissionTypeT
                                                        .ContractAndRates
                                                ]
                                            }
                                            value={
                                                SubmissionTypeT.ContractAndRates
                                            }
                                        />
                                    </Fieldset>
                                </FormGroup>

                                <FormGroup className={styles.formGroupLast}>
                                    <Label htmlFor="submissionDescription">
                                        Submission description
                                    </Label>
                                    {showFieldErrors(
                                        errors.submissionDescription
                                    ) && (
                                        <ErrorMessage>
                                            {errors.submissionDescription}
                                        </ErrorMessage>
                                    )}
                                    <Link
                                        variant="nav"
                                        href={
                                            '/help/submission-description-examples'
                                        }
                                        target="_blank"
                                    >
                                        View description examples
                                    </Link>
                                    <p className="usa-hint margin-top-1">
                                        Provide a description of any major
                                        changes or updates
                                    </p>
                                    <Field
                                        as={Textarea}
                                        aria-required
                                        id="submissionDescription"
                                        name="submissionDescription"
                                        value={values.submissionDescription}
                                        error={showFieldErrors(
                                            errors.submissionDescription
                                        )}
                                    />
                                </FormGroup>
                            </div>
                            <ButtonGroup
                                type="default"
                                className={styles.buttonGroup}
                            >
                                <Button
                                    type="button"
                                    secondary
                                    onClick={() =>
                                        validateForm()
                                            .then(() => {
                                                setShouldValidate(true)
                                            })
                                            .catch(() =>
                                                console.warn('Validation Error')
                                            )
                                    }
                                >
                                    Test Validation
                                </Button>
                                <Link
                                    asCustom={NavLink}
                                    className="usa-button usa-button--outline"
                                    variant="unstyled"
                                    to="/dashboard"
                                >
                                    Cancel
                                </Link>
                                <Button type="submit" disabled={isSubmitting}>
                                    Continue
                                </Button>
                            </ButtonGroup>
                        </fieldset>
                    </UswdsForm>
                </>
            )}
        </Formik>
    )
}
