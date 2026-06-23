import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Form as UswdsForm,
    FormGroup,
    ButtonGroup,
    DatePicker,
    Label,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import * as Yup from 'yup'
import { ContractSubmissionTypeRecord } from '@mc-review/constants'
import {
    StateUser,
    User,
    FetchContractWithQuestionsQuery,
} from '../../../gen/gqlClient'
import { formatUserInputDate } from '@mc-review/dates'
import styles from '../QuestionResponse.module.scss'
import selectStyles from '../../../components/Select/Select.module.scss'
import { AccessibleSelect } from '../../../components/Select'
import { LinkWithLogging } from '../../../components/TealiumLogging'
import {
    ActionButton,
    ErrorSummary,
    FieldTextarea,
    FileUpload,
    GenericApiErrorBanner,
    PageActionsContainer,
    PoliteErrorMessage,
} from '../../../components'
import {
    ACCEPTED_SUBMISSION_FILE_TYPES,
    FileItemT,
} from '../../../components/FileUpload'
import { useFileUpload } from '../../../hooks/useFileUpload'
import { useS3 } from '../../../contexts/S3Context'
import { useErrorSummary } from '../../../hooks/useErrorSummary'
import { QuestionDisplayTable } from '../QATable/QuestionDisplayTable'
import { QAUploadFormSummary } from '../QAUploadFormSummary'
import {
    extractDocumentsFromQuestion,
    QuestionType,
} from '../QuestionResponseHelpers/questionResponseHelpers'

type AdminSelectOption = { label: string; value: string }
type ContractWithQuestions = NonNullable<
    FetchContractWithQuestionsQuery['fetchContract']['contract']
>

type AdminResponseFormValues = {
    addedByUserID: string
    createdAt: string
    reason: string
}

// The data handed back to the page when the form is submitted.
export type AdminUploadResponseFormData = AdminResponseFormValues & {
    documents: FileItemT[]
}

const userRoleDisplayNames: Record<string, string> = {
    STATE_USER: 'State User',
}

type AdminUploadResponseFormProps = {
    handleSubmit: (data: AdminUploadResponseFormData) => Promise<void>
    apiLoading: boolean
    apiError: boolean
    contract: ContractWithQuestions
    question?: QuestionType
    stateUsers: StateUser[]
    loggedInUser?: User
}

// Owns the admin response form: the Formik state, the document upload, and the
// field rendering. Everything that does not depend on the live Formik values is
// computed before the Formik block; the values-dependent bits are derived at the
// top of the render function, before its returned JSX.
const AdminUploadResponseForm = ({
    handleSubmit,
    apiLoading,
    apiError,
    contract,
    question,
    stateUsers,
    loggedInUser,
}: AdminUploadResponseFormProps) => {
    const navigate = useNavigate()
    const { handleUploadFile, handleScanFile } = useS3()
    const [shouldValidate, setShouldValidate] = useState(false)
    const {
        hasValidFiles,
        hasNoFiles,
        onFileItemsUpdate,
        fileUploadError,
        cleanFileItemsBeforeSave,
    } = useFileUpload(shouldValidate)
    const { setFocusErrorSummaryHeading, errorSummaryHeadingRef } =
        useErrorSummary()

    const baseQARedirectURL = `/submissions/${
        ContractSubmissionTypeRecord[contract.contractSubmissionType]
    }/${contract.id}/question-and-answers`

    const todayISO = new Date().toISOString().slice(0, 10)
    // The response cannot predate the question it answers.
    const questionDateISO = question
        ? new Date(question.createdAt).toISOString().slice(0, 10)
        : undefined
    const questionRound = question?.round ?? 0

    const userOptions: AdminSelectOption[] = stateUsers.map((u) => ({
        label: u.email,
        value: u.id,
    }))

    const initialValues: AdminResponseFormValues = {
        addedByUserID: '',
        createdAt: '',
        reason: '',
    }

    // Field order matches the page so the error summary lists them in page order.
    const validationSchema = Yup.object().shape({
        addedByUserID: Yup.string().required('You must select a state user'),
        createdAt: Yup.string()
            .test(
                'not-future',
                'The response date cannot be in the future',
                (value) => !value || value <= todayISO
            )
            .test(
                'not-before-question',
                'The response date cannot be before the question was created',
                (value) =>
                    !value || !questionDateISO || value >= questionDateISO
            ),
        reason: Yup.string().trim().required('You must provide a reason'),
    })

    const showFieldErrors = (error?: string): boolean =>
        shouldValidate && Boolean(error)

    const fileError = Boolean(shouldValidate && fileUploadError)

    // The id of each field's focusable element, so the error summary links land
    // on the right control. react-select and the date picker keep their `name`
    // on hidden inputs, so a `#id` key (focus by id) is used rather than the
    // field name.
    const fieldFocusId: Record<string, string> = {
        addedByUserID: 'response-user-select',
        reason: 'reason',
        createdAt: 'admin-response-createdAt',
    }

    // Copy each Formik field error, then append the document-upload error (which
    // is validated outside of the Yup schema). Mirrors ContractDetails.
    const generateErrorSummaryErrors = (
        errors: FormikErrors<AdminResponseFormValues>
    ) => {
        const errorsObject: { [field: string]: string } = {}
        if (fileUploadError) {
            errorsObject['#admin-response-upload'] = fileUploadError
        }
        Object.entries(errors).forEach(([field, value]) => {
            errorsObject[`#${fieldFocusId[field] ?? field}`] = value
        })
        return errorsObject
    }

    const onFormSubmit = async (values: AdminResponseFormValues) => {
        // Documents are validated outside of the Yup schema.
        if (!hasValidFiles || hasNoFiles) {
            return
        }
        const cleaned = cleanFileItemsBeforeSave()
        await handleSubmit({ ...values, documents: cleaned })
    }

    return (
        <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={(values) => onFormSubmit(values)}
        >
            {({ values, errors, setFieldValue, handleSubmit: submitForm }) => {
                // The state user being recorded on behalf of.
                const selectedStateUser = stateUsers.find(
                    (u) => u.id === values.addedByUserID
                )
                const displayedUserState = selectedStateUser?.state.code

                const selectedUserOption =
                    userOptions.find((o) => o.value === values.addedByUserID) ??
                    null

                return (
                    <UswdsForm
                        className={styles.formContainer}
                        id="contractAdminAddResponseForm"
                        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                            setShouldValidate(true)
                            setFocusErrorSummaryHeading(true)
                            return submitForm(e)
                        }}
                    >
                        {apiError && <GenericApiErrorBanner />}
                        {shouldValidate && (
                            <ErrorSummary
                                errors={generateErrorSummaryErrors(errors)}
                                headingRef={errorSummaryHeadingRef}
                            />
                        )}
                        <fieldset className="usa-fieldset">
                            <h2>Add response</h2>
                            {question && (
                                <QAUploadFormSummary
                                    isContract
                                    division={question.division}
                                    round={questionRound}
                                />
                            )}
                            <p>
                                Record a response on behalf of the state. No
                                notification emails are sent for admin-created
                                responses.
                            </p>

                            {question ? (
                                <QuestionDisplayTable
                                    documents={extractDocumentsFromQuestion(
                                        question
                                    )}
                                    user={loggedInUser!}
                                    onlyDisplayInitial
                                />
                            ) : (
                                <p>Related question unable to display</p>
                            )}

                            <FormGroup error={fileError}>
                                <FileUpload
                                    id="admin-response-upload"
                                    name="admin-response-upload"
                                    label="Upload response"
                                    aria-required
                                    error={fileError ? fileUploadError : ''}
                                    hint={
                                        <span>
                                            This input only accepts PDF, CSV,
                                            DOC, DOCX, XLS, XLSX, XLSM files.
                                        </span>
                                    }
                                    accept={ACCEPTED_SUBMISSION_FILE_TYPES}
                                    uploadFile={(file) =>
                                        handleUploadFile(
                                            file,
                                            'QUESTION_ANSWER_DOCS'
                                        )
                                    }
                                    scanFile={(key) =>
                                        handleScanFile(
                                            key,
                                            'QUESTION_ANSWER_DOCS'
                                        )
                                    }
                                    onFileItemsUpdate={onFileItemsUpdate}
                                />
                            </FormGroup>

                            <FormGroup>
                                <Label htmlFor="response-user-select">
                                    Respond on behalf of
                                </Label>
                                <span
                                    className="usa-hint"
                                    id="response-user-select-hint"
                                >
                                    Select a state user to attribute this
                                    response to.
                                </span>
                                <AccessibleSelect<AdminSelectOption>
                                    inputId="response-user-select"
                                    name="addedByUserID"
                                    aria-describedby="response-user-select-hint"
                                    className={selectStyles.multiSelect}
                                    classNamePrefix="select"
                                    isSearchable
                                    isClearable
                                    options={userOptions}
                                    value={selectedUserOption}
                                    onChange={(newValue) =>
                                        setFieldValue(
                                            'addedByUserID',
                                            newValue?.value ?? ''
                                        )
                                    }
                                />
                                {selectedStateUser && (
                                    <div
                                        className={styles.selectedUserSummary}
                                        data-testid="selected-response-user-info"
                                    >
                                        <div
                                            className={styles.selectedUserLabel}
                                        >
                                            Selected user
                                        </div>
                                        <address
                                            className={
                                                styles.selectedUserAddress
                                            }
                                        >
                                            {selectedStateUser.givenName}{' '}
                                            {selectedStateUser.familyName}
                                            <br />
                                            {userRoleDisplayNames[
                                                selectedStateUser.role
                                            ] ?? selectedStateUser.role}
                                            <br />
                                            <LinkWithLogging
                                                href={`mailto:${selectedStateUser.email}`}
                                                target="_blank"
                                                variant="external"
                                                rel="noreferrer"
                                                event_name="contact_click"
                                                contact_method="email"
                                            >
                                                {selectedStateUser.email}
                                            </LinkWithLogging>
                                            {displayedUserState && (
                                                <>
                                                    <br />
                                                    {displayedUserState}
                                                </>
                                            )}
                                        </address>
                                    </div>
                                )}
                            </FormGroup>

                            <FormGroup
                                error={showFieldErrors(errors.createdAt)}
                            >
                                <Label
                                    id="admin-response-createdAt-label"
                                    htmlFor="admin-response-createdAt"
                                >
                                    Response date
                                </Label>
                                <span className={styles.requiredOptionalText}>
                                    Optional
                                </span>
                                <span
                                    className="usa-hint"
                                    id="admin-response-createdAt-hint"
                                >
                                    mm/dd/yyyy. Must be on or after the question
                                    date and not in the future. Defaults to
                                    today when left blank.
                                </span>
                                {showFieldErrors(errors.createdAt) && (
                                    <PoliteErrorMessage formFieldLabel="Response date">
                                        {errors.createdAt}
                                    </PoliteErrorMessage>
                                )}
                                <DatePicker
                                    validationStatus={
                                        showFieldErrors(errors.createdAt)
                                            ? 'error'
                                            : undefined
                                    }
                                    aria-labelledby="admin-response-createdAt-label"
                                    aria-describedby="admin-response-createdAt-hint"
                                    id="admin-response-createdAt"
                                    name="createdAt"
                                    minDate={questionDateISO}
                                    maxDate={todayISO}
                                    onChange={(val) =>
                                        setFieldValue(
                                            'createdAt',
                                            formatUserInputDate(val)
                                        )
                                    }
                                />
                            </FormGroup>

                            <FieldTextarea
                                label="Reason"
                                id="reason"
                                name="reason"
                                aria-required
                                hint="Recorded on this response's audit log."
                                showError={showFieldErrors(errors.reason)}
                            />
                        </fieldset>
                        <PageActionsContainer>
                            <ButtonGroup type="default">
                                <ActionButton
                                    type="button"
                                    variant="outline"
                                    data-testid="page-actions-left-secondary"
                                    disabled={apiLoading}
                                    parent_component_type="page body"
                                    link_url={baseQARedirectURL}
                                    onClick={() => navigate(baseQARedirectURL)}
                                >
                                    Cancel
                                </ActionButton>

                                <ActionButton
                                    type="submit"
                                    variant="default"
                                    data-testid="page-actions-right-primary"
                                    parent_component_type="page body"
                                    link_url={`${baseQARedirectURL}?submit=response`}
                                    animationTimeout={1000}
                                    loading={apiLoading}
                                >
                                    Add response
                                </ActionButton>
                            </ButtonGroup>
                        </PageActionsContainer>
                    </UswdsForm>
                )
            }}
        </Formik>
    )
}

export { AdminUploadResponseForm }
