import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ContractSubmissionTypeRecord } from '@mc-review/constants'
import {
    Form as UswdsForm,
    FormGroup,
    ButtonGroup,
    DatePicker,
    Label,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import * as Yup from 'yup'
import {
    Division,
    CmsUser,
    CmsApproverUser,
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
import { divisionFullNames } from '../QuestionResponseHelpers'

type AdminSelectOption = { label: string; value: string }
type CmsUserNode = CmsUser | CmsApproverUser
type ContractWithQuestions = NonNullable<
    FetchContractWithQuestionsQuery['fetchContract']['contract']
>

type AdminQuestionFormValues = {
    addedByUserID: string
    division: Division | ''
    createdAt: string
    reason: string
}

// The data handed back to the page when the form is submitted.
export type AdminUploadQuestionsFormData = AdminQuestionFormValues & {
    documents: FileItemT[]
}

const userRoleDisplayNames: Record<string, string> = {
    CMS_USER: 'CMS User',
    CMS_APPROVER_USER: 'CMS Approver',
    ADMIN_USER: 'Admin',
}

type AdminUploadQuestionsFormProps = {
    handleSubmit: (data: AdminUploadQuestionsFormData) => Promise<void>
    apiLoading: boolean
    apiError: boolean
    contract: ContractWithQuestions
    cmsUsers: CmsUserNode[]
    loggedInUser?: User
    adminOnlyQaRounds: boolean
}

// Owns the admin question form: the Formik state, the document upload, and the
// field rendering. Everything that does not depend on the live Formik values is
// computed before the Formik block; the values-dependent bits are derived at the
// top of the render function, before its returned JSX.
const AdminUploadQuestionsForm = ({
    handleSubmit,
    apiLoading,
    apiError,
    contract,
    cmsUsers,
    loggedInUser,
    adminOnlyQaRounds,
}: AdminUploadQuestionsFormProps) => {
    const navigate = useNavigate()
    const { handleUploadFile, handleScanFile } = useS3()
    const baseQARedirectURL = `/submissions/${
        ContractSubmissionTypeRecord[contract.contractSubmissionType]
    }/${contract.id}/question-and-answers`
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

    const todayISO = new Date().toISOString().slice(0, 10)

    const userOptions: AdminSelectOption[] = [
        ...(adminOnlyQaRounds
            ? [{ label: 'Myself (admin)', value: 'myself' }]
            : []),
        ...cmsUsers.map((user) => ({
            label: user.email,
            value: user.id,
        })),
    ]
    const divisionOptions: AdminSelectOption[] = (
        Object.keys(divisionFullNames) as Division[]
    ).map((d) => ({ label: divisionFullNames[d], value: d }))

    const initialValues: AdminQuestionFormValues = {
        addedByUserID: '',
        division: '',
        createdAt: '',
        reason: '',
    }

    // Built with a closure over cmsUsers so the division rule can check whether
    // the selected CMS user supplies the division (in which case it is derived).
    // Field order matches the page so the error summary lists them in page order.
    const validationSchema = Yup.object().shape({
        division: Yup.string().test(
            'division-required',
            'You must select a division',
            function (value) {
                const cmsUser = cmsUsers.find(
                    (u) => u.id === this.parent.addedByUserID
                )
                if (cmsUser?.divisionAssignment) {
                    return true
                }
                return Boolean(value)
            }
        ),
        createdAt: Yup.string().test(
            'not-future',
            'The question date cannot be in the future',
            (value) => !value || value <= todayISO
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
        reason: 'reason',
        division: 'division-select',
        createdAt: 'admin-question-createdAt',
    }

    // Copy each Formik field error, then append the document-upload error (which
    // is validated outside of the Yup schema). Mirrors ContractDetails.
    const generateErrorSummaryErrors = (
        errors: FormikErrors<AdminQuestionFormValues>
    ) => {
        const errorsObject: { [field: string]: string } = {}
        if (fileUploadError) {
            errorsObject['#admin-question-upload'] = fileUploadError
        }
        Object.entries(errors).forEach(([field, value]) => {
            if (typeof value === 'string') {
                errorsObject[`#${fieldFocusId[field] ?? field}`] = value
            }
        })
        return errorsObject
    }

    const onFormSubmit = async (values: AdminQuestionFormValues) => {
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
                // The CMS user being asked on behalf of (if any) and the division
                // that flows from them. When that user has a division it is
                // locked; otherwise the admin picks one.
                const selectedCmsUser = cmsUsers.find(
                    (u) => u.id === values.addedByUserID
                )
                const selectedUserDivision =
                    selectedCmsUser?.divisionAssignment ?? undefined
                const hasLockedDivision = Boolean(
                    values.addedByUserID && selectedUserDivision
                )

                // Who the question is attributed to — the CMS user, or the admin.
                // Show the admin only when they explicitly pick "Myself".
                const myselfSelected =
                    adminOnlyQaRounds && values.addedByUserID === 'myself'
                const displayedUser =
                    selectedCmsUser ??
                    (myselfSelected ? loggedInUser : undefined)
                const displayedUserDivision =
                    displayedUser && 'divisionAssignment' in displayedUser
                        ? displayedUser.divisionAssignment
                        : undefined

                const selectedCmsUserOption =
                    userOptions.find((o) => o.value === values.addedByUserID) ??
                    null
                const selectedDivisionOption =
                    divisionOptions.find((o) => o.value === values.division) ??
                    null

                return (
                    <UswdsForm
                        className={styles.formContainer}
                        id="contractAdminAddQuestionsForm"
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
                            <h2>Add questions</h2>
                            <p>
                                Record a question on behalf of CMS. No
                                notification emails are sent for admin-created
                                questions.
                            </p>

                            <FormGroup error={fileError}>
                                <FileUpload
                                    id="admin-question-upload"
                                    name="admin-question-upload"
                                    label="Upload questions"
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
                                <Label htmlFor="cms-user-select">
                                    Ask on behalf of
                                </Label>
                                <span className={styles.requiredOptionalText}>
                                    Optional
                                </span>
                                <span
                                    className="usa-hint"
                                    id="cms-user-select-hint"
                                >
                                    Select a CMS user to attribute this question
                                    to. The division is set from that user when
                                    they have one; otherwise pick a division
                                    below. Leave as "Myself" to attribute the
                                    question to your admin account.
                                </span>
                                <AccessibleSelect<AdminSelectOption>
                                    inputId="cms-user-select"
                                    name="addedByUserID"
                                    aria-describedby="cms-user-select-hint"
                                    className={selectStyles.multiSelect}
                                    classNamePrefix="select"
                                    isSearchable
                                    isClearable={!adminOnlyQaRounds}
                                    options={userOptions}
                                    value={selectedCmsUserOption}
                                    onChange={(newValue) =>
                                        setFieldValue(
                                            'addedByUserID',
                                            newValue?.value ?? ''
                                        )
                                    }
                                />
                                {displayedUser && (
                                    <div
                                        className={styles.selectedUserSummary}
                                        data-testid="selected-user-info"
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
                                            {displayedUser.givenName}{' '}
                                            {displayedUser.familyName}
                                            <br />
                                            {userRoleDisplayNames[
                                                displayedUser.role
                                            ] ?? displayedUser.role}
                                            <br />
                                            <LinkWithLogging
                                                href={`mailto:${displayedUser.email}`}
                                                target="_blank"
                                                variant="external"
                                                rel="noreferrer"
                                                event_name="contact_click"
                                                contact_method="email"
                                            >
                                                {displayedUser.email}
                                            </LinkWithLogging>
                                            <br />
                                            {displayedUserDivision ??
                                                'No division'}
                                        </address>
                                    </div>
                                )}
                            </FormGroup>

                            {hasLockedDivision ? (
                                <FormGroup>
                                    <Label htmlFor="derived-division">
                                        Division
                                    </Label>
                                    <p id="derived-division">
                                        {selectedUserDivision &&
                                            divisionFullNames[
                                                selectedUserDivision
                                            ]}
                                    </p>
                                </FormGroup>
                            ) : (
                                <FormGroup
                                    error={showFieldErrors(errors.division)}
                                >
                                    <Label htmlFor="division-select">
                                        Division
                                    </Label>
                                    <span
                                        className={styles.requiredOptionalText}
                                    >
                                        Required
                                    </span>
                                    {showFieldErrors(errors.division) && (
                                        <PoliteErrorMessage formFieldLabel="Division">
                                            {errors.division}
                                        </PoliteErrorMessage>
                                    )}
                                    <AccessibleSelect<AdminSelectOption>
                                        inputId="division-select"
                                        name="division"
                                        className={selectStyles.multiSelect}
                                        classNamePrefix="select"
                                        placeholder="- Select division -"
                                        isClearable
                                        options={divisionOptions}
                                        value={selectedDivisionOption}
                                        onChange={(newValue) =>
                                            setFieldValue(
                                                'division',
                                                newValue?.value ?? ''
                                            )
                                        }
                                    />
                                </FormGroup>
                            )}

                            <FormGroup
                                error={showFieldErrors(errors.createdAt)}
                            >
                                <Label
                                    id="admin-question-createdAt-label"
                                    htmlFor="admin-question-createdAt"
                                >
                                    Question date
                                </Label>
                                <span className={styles.requiredOptionalText}>
                                    Optional
                                </span>
                                <span
                                    className="usa-hint"
                                    id="admin-question-createdAt-hint"
                                >
                                    mm/dd/yyyy. Cannot be a future date.
                                    Defaults to today when left blank.
                                </span>
                                {showFieldErrors(errors.createdAt) && (
                                    <PoliteErrorMessage formFieldLabel="Question date">
                                        {errors.createdAt}
                                    </PoliteErrorMessage>
                                )}
                                <DatePicker
                                    validationStatus={
                                        showFieldErrors(errors.createdAt)
                                            ? 'error'
                                            : undefined
                                    }
                                    aria-labelledby="admin-question-createdAt-label"
                                    aria-describedby="admin-question-createdAt-hint"
                                    id="admin-question-createdAt"
                                    name="createdAt"
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
                                hint="Recorded on this question's audit log."
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
                                    link_url={`${baseQARedirectURL}?submit=question`}
                                    animationTimeout={1000}
                                    loading={apiLoading}
                                >
                                    Add questions
                                </ActionButton>
                            </ButtonGroup>
                        </PageActionsContainer>
                    </UswdsForm>
                )
            }}
        </Formik>
    )
}

export { AdminUploadQuestionsForm }
