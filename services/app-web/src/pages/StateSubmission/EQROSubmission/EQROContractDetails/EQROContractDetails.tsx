import React, { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import {
    FileUpload,
    FileItemT,
    ErrorSummary,
    PoliteErrorMessage,
    FieldYesNo,
    DynamicStepIndicator,
    LinkWithLogging,
    FormNotificationContainer,
    FormContainer,
    PageActions,
} from '../../../../components'
import {
    Form as UswdsForm,
    FormGroup,
    Fieldset,
    DateRangePicker,
} from '@trussworks/react-uswds'
import { v4 as uuidv4 } from 'uuid'

import { generatePath, useNavigate } from 'react-router-dom'
import { Formik, FormikErrors, getIn } from 'formik'
import styles from '../../StateSubmissionForm.module.scss'

import { formatForForm, isDateRangeEmpty } from '../../../../formHelpers'
import { formatUserInputDate } from '@mc-review/dates'
import { useS3 } from '../../../../contexts/S3Context'

import { EQROContractDetailsFormSchema } from './EQROContractDetailsSchema'

import {
    type ContractFormPageProps,
} from '../../submissionUtils'

import {
    formatDocumentsForGQL,
    formatDocumentsForForm,
    formatFormDateForGQL,
} from '../../../../formHelpers/formatters'

import { ACCEPTED_SUBMISSION_FILE_TYPES } from '../../../../components/FileUpload'
import {
    isContractAmendment,
    isContractWithProvisions,
} from '@mc-review/submissions'
import { featureFlags } from '@mc-review/common-code'

import { useRouteParams, useCurrentRoute } from '../../../../hooks'

import { 
    RoutesRecord, 
    EQRO_SUBMISSION_FORM_ROUTES,
    RouteT,
} from '@mc-review/constants'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import {
    booleanAsYesNoFormValue,
    yesNoFormValueAsBoolean,
} from '../../../../components/Form/FieldYesNo'

import { useAuth } from '../../../../contexts/AuthContext'
import { ErrorOrLoadingPage } from '../../SharedSubmissionComponents'
import { PageBannerAlerts } from '../../SharedSubmissionComponents'
import { useErrorSummary } from '../../../../hooks/useErrorSummary'
import { useContractForm } from '../../../../hooks/useContractForm'
import {
    UpdateContractDraftRevisionInput,
    ContractDraftRevisionFormDataInput,
} from '../../../../gen/gqlClient'
import { useFocusOnRender } from '../../../../hooks/useFocusOnRender'

import { usePage } from '../../../../contexts/PageContext'


function formattedDatePlusOneDay(initialValue: string): string {
    const dayjsValue = dayjs(initialValue)
    return initialValue && dayjsValue.isValid()
        ? dayjsValue.add(1, 'day').format('YYYY-MM-DD')
        : initialValue // preserve undefined to show validations later
}

function formattedDateMinusOneDay(initialValue: string): string {
    const dayjsValue = dayjs(initialValue)
    return initialValue && dayjsValue.isValid()
        ? dayjsValue.subtract(1, 'day').format('YYYY-MM-DD')
        : initialValue // preserve undefined to show validations later
}

const ContractDatesErrorMessage = ({
    values,
    validationErrorMessage,
    formFieldLabel,
}: {
    values: ContractDetailsFormValues
    validationErrorMessage: string
    formFieldLabel: string
}): React.ReactElement => (
    <PoliteErrorMessage formFieldLabel={formFieldLabel}>
        {isDateRangeEmpty(values.contractDateStart, values.contractDateEnd)
            ? 'You must provide a start and an end date'
            : validationErrorMessage}
    </PoliteErrorMessage>
)

export type ContractDetailsFormValues = {
    contractDocuments: FileItemT[]
    supportingDocuments: FileItemT[]
    contractDateStart: string
    contractDateEnd: string
    eqroNewContractor: string | undefined
    eqroProvisionMcoNewOptionalActivity: string | undefined
    eqroProvisionNewMcoEqrRelatedActivities: string | undefined
    eqroProvisionChipEqrRelatedActivities: string | undefined
    eqroProvisionMcoEqrOrRelatedActivities: string | undefined
}

export type FormError =
    FormikErrors<ContractDetailsFormValues>[keyof FormikErrors<ContractDetailsFormValues>]

export const EQROContractDetails = ({
    showValidations = false,
}: ContractFormPageProps): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = useState(showValidations)
    const [draftSaved, setDraftSaved] = useState(false)
    useFocusOnRender(draftSaved, '[data-testid="saveAsDraftSuccessBanner"]')
    const { id, contractSubmissionType } = useRouteParams()
    const navigate = useNavigate()
    const ldClient = useLDClient()
    const { setFocusErrorSummaryHeading, errorSummaryHeadingRef } =
            useErrorSummary()
    const { loggedInUser } = useAuth()
    const { updateActiveMainContent } = usePage()
    const { currentRoute } = useCurrentRoute()
    const { draftSubmission, interimState, updateDraft, showPageErrorMessage } =
        useContractForm(id)

    const contactsPagePath = generatePath(RoutesRecord.SUBMISSIONS_CONTACTS, {
        id,
        contractSubmissionType,
    })
    const submissionDetailsPath = generatePath(RoutesRecord.SUBMISSIONS_TYPE, {
        id,
        contractSubmissionType,
    })

    const activeMainContentId = 'contractDetailsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    const hideSupportingDocs = ldClient?.variation(
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.flag,
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.defaultValue
    )

    // Contract documents state management
    const { getKey, handleUploadFile, handleScanFile } = useS3()
    if (interimState || !draftSubmission)
        return <ErrorOrLoadingPage state={interimState || 'GENERIC_ERROR'} />

    //Boolean constants to control conditional rendering of EQRO-specific questions
    const contractType: string = draftSubmission.draftRevision.formData.contractType ?? ''
    const isBaseContract: boolean = contractType.includes("BASE")

    const populationCovered: string = draftSubmission.draftRevision.formData.populationCovered ?? ''
    const isChipPopulation: boolean = populationCovered.includes("CHIP")

    const managedCareEntities: string [] = draftSubmission.draftRevision.formData.managedCareEntities ?? []
    const isMCO: boolean = managedCareEntities.includes("MCO")
    
    const fileItemsFromDraftSubmission = (
        docType: string
    ): FileItemT[] | undefined => {
        if (
            (draftSubmission &&
                docType === 'contract' &&
                !draftSubmission.draftRevision.formData.contractDocuments) ||
            (draftSubmission &&
                docType === 'supporting' &&
                !draftSubmission.draftRevision.formData.supportingDocuments)
        )
            return undefined
        const docs =
            docType === 'contract'
                ? draftSubmission.draftRevision.formData.contractDocuments
                : draftSubmission.draftRevision.formData.supportingDocuments
        return docs.map((doc) => {
            const key = getKey(doc.s3URL)
            if (!key) {
                return {
                    id: uuidv4(),
                    name: doc.name,
                    key: 'INVALID_KEY',
                    s3URL: undefined,
                    status: 'UPLOAD_ERROR',
                    sha256: doc.sha256,
                }
            }
            return {
                id: uuidv4(),
                name: doc.name,
                key: key,
                s3URL: doc.s3URL,
                status: 'UPLOAD_COMPLETE',
                sha256: doc.sha256,
            }
        })
    }

    const contractDetailsInitialValues: ContractDetailsFormValues = {
        contractDocuments: formatDocumentsForForm({
            documents: draftSubmission.draftRevision.formData.contractDocuments,
            getKey: getKey,
        }),
        supportingDocuments: formatDocumentsForForm({
            documents:
                draftSubmission.draftRevision.formData.supportingDocuments,
            getKey: getKey,
        }),
        contractDateStart:
            (draftSubmission &&
                formatForForm(
                    draftSubmission.draftRevision.formData.contractDateStart
                )) ??
            '',
        contractDateEnd:
            (draftSubmission &&
                formatForForm(
                    draftSubmission.draftRevision.formData.contractDateEnd
                )) ??
            '',
        eqroNewContractor:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .eqroNewContractor
            ) ?? '',
        eqroProvisionMcoEqrOrRelatedActivities:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .eqroProvisionMcoEqrOrRelatedActivities
            ) ?? '',
        eqroProvisionMcoNewOptionalActivity:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .eqroProvisionMcoNewOptionalActivity
            ) ?? '',
        eqroProvisionNewMcoEqrRelatedActivities:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .eqroProvisionNewMcoEqrRelatedActivities
            ) ?? '',
        eqroProvisionChipEqrRelatedActivities:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .eqroProvisionChipEqrRelatedActivities
            ) ?? '',
    }

    const showFieldErrors = (
        fieldName: keyof ContractDetailsFormValues,
        errors: FormikErrors<ContractDetailsFormValues>
    ): string | undefined => {
        if (!shouldValidate) return undefined
        return getIn(errors, `${fieldName}`)
    }

    const genecontractErrorsummaryErrors = (
        errors: FormikErrors<ContractDetailsFormValues>,
        values: ContractDetailsFormValues
    ) => {
        const errorsObject: { [field: string]: string } = {}
        Object.entries(errors).forEach(([field, value]) => {
            if (typeof value === 'string') {
                errorsObject[field] = value
            }
            if (Array.isArray(value) && Array.length > 0) {
                Object.entries(value).forEach(
                    ([arrItemField, arrItemValue]) => {
                        if (typeof arrItemValue === 'string') {
                            errorsObject[arrItemField] = arrItemValue
                        }
                    }
                )
            }
        })
        values.contractDocuments.forEach((item) => {
            const key = 'contractDocuments'
            if (item.status === 'DUPLICATE_NAME_ERROR') {
                errorsObject[key] =
                    'You must remove all documents with error messages before continuing'
            } else if (item.status === 'SCANNING_ERROR') {
                errorsObject[key] =
                    'You must remove files that failed the security scan'
            } else if (item.status === 'UPLOAD_ERROR') {
                errorsObject[key] =
                    'You must remove or retry files that failed to upload'
            }
        })
        // return errors
        return errorsObject
    }

    //const formHeading = 'EQRO Contract Details Form'
    const handleFormSubmit = async (
        values: ContractDetailsFormValues,
        setSubmitting: (isSubmitting: boolean) => void, // formik setSubmitting
        options: {
            type: 'SAVE_AS_DRAFT' | 'BACK' | 'CONTINUE'
            redirectPath?: RouteT
        }
    ) => {
        if (options.type === 'SAVE_AS_DRAFT' && draftSaved) {
            setDraftSaved(false)
        }

        const { __typename, ...formData } = draftSubmission.draftRevision.formData

        const updatedDraftSubmissionFormData: ContractDraftRevisionFormDataInput = {
            ...formData, 
            contractDateStart: formatFormDateForGQL(values.contractDateStart),
            contractDateEnd: formatFormDateForGQL(values.contractDateEnd),
            contractDocuments: formatDocumentsForGQL(values.contractDocuments) || [],
            supportingDocuments: formatDocumentsForGQL(values.supportingDocuments) || [],
        }

        if (
            draftSubmission === undefined ||
            !updateDraft ||
            !draftSubmission.draftRevision
        ) {
            console.info(draftSubmission, updateDraft)
            console.info(
                'ERROR, SubmissionType for does not have props needed to update a draft.'
            )
            return
        }
        
        if (isContractWithProvisions(draftSubmission)) {
            updatedDraftSubmissionFormData.eqroNewContractor =
                yesNoFormValueAsBoolean(values.eqroNewContractor)
            updatedDraftSubmissionFormData.eqroProvisionMcoEqrOrRelatedActivities =
                yesNoFormValueAsBoolean(values.eqroProvisionMcoEqrOrRelatedActivities)
            updatedDraftSubmissionFormData.eqroProvisionMcoNewOptionalActivity =
                yesNoFormValueAsBoolean(values.eqroProvisionMcoNewOptionalActivity)
            updatedDraftSubmissionFormData.eqroProvisionNewMcoEqrRelatedActivities =
                yesNoFormValueAsBoolean(values.eqroProvisionNewMcoEqrRelatedActivities)
            updatedDraftSubmissionFormData.eqroProvisionChipEqrRelatedActivities =
                yesNoFormValueAsBoolean(values.eqroProvisionChipEqrRelatedActivities)
        } else {
            updatedDraftSubmissionFormData.eqroNewContractor = undefined
            updatedDraftSubmissionFormData.eqroProvisionMcoEqrOrRelatedActivities = undefined
            updatedDraftSubmissionFormData.eqroProvisionMcoNewOptionalActivity = undefined
            updatedDraftSubmissionFormData.eqroProvisionNewMcoEqrRelatedActivities = undefined
            updatedDraftSubmissionFormData.eqroProvisionChipEqrRelatedActivities = undefined
        }

        const updatedContract: UpdateContractDraftRevisionInput = {
            formData: updatedDraftSubmissionFormData,
            contractID: draftSubmission.id,
            lastSeenUpdatedAt: draftSubmission.draftRevision.updatedAt,
        }

        const updatedSubmission = await updateDraft(updatedContract)
        if (updatedSubmission instanceof Error) {
            setSubmitting(false)
            console.info('Error updating draft submission: ', updatedSubmission)
        } else if (options.type === 'SAVE_AS_DRAFT' && updatedSubmission) {
            setDraftSaved(true)
            setSubmitting(false)
        } else {
            if (options.redirectPath) {
                navigate(
                    generatePath(RoutesRecord[options.redirectPath], {
                        id,
                        contractSubmissionType,
                    })
                )
            }
        }
}
    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={EQRO_SUBMISSION_FORM_ROUTES}
                    currentFormPage={currentRoute}
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                    }}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={draftSubmission.draftRevision.unlockInfo}
                    showPageErrorMessage={showPageErrorMessage ?? false}
                    draftSaved={draftSaved}
                />
            </FormNotificationContainer>
            <FormContainer id="contractDetails">
                <Formik
                    initialValues={contractDetailsInitialValues}
                    onSubmit={(values, { setSubmitting }) => {
                        return handleFormSubmit(values, setSubmitting, {
                            type: 'CONTINUE',
                            redirectPath:
                                draftSubmission.draftRevision.formData
                                    .submissionType === 'CONTRACT_ONLY'
                                    ? 'SUBMISSIONS_CONTACTS'
                                    : 'SUBMISSIONS_RATE_DETAILS',
                        })
                    }}
                    validationSchema={() =>
                        EQROContractDetailsFormSchema(
                            draftSubmission,
                        )
                    }
                >
                    {({
                        values,
                        errors,
                        handleSubmit,
                        setSubmitting,
                        isSubmitting,
                        setFieldValue,
                    }) => {
                        const shouldShowOptionalFields = 
                            (!isBaseContract && isMCO && values.eqroProvisionMcoEqrOrRelatedActivities === 'YES') || 
                            (isBaseContract && isMCO)

                        if (!shouldShowOptionalFields) {
                            if (values.eqroProvisionMcoNewOptionalActivity) {
                                void setFieldValue('eqroProvisionMcoNewOptionalActivity', '')
                            }
                            if (values.eqroProvisionNewMcoEqrRelatedActivities) {
                                void setFieldValue('eqroProvisionNewMcoEqrRelatedActivities', '')
                            }
                        }

                        return (
                <>
                <UswdsForm
                    className={styles.formContainer}
                    //onSubmit={() => console.info('submit placeholder')}
                    onSubmit={(e) => {
                        setShouldValidate(true)
                        setFocusErrorSummaryHeading(true)
                        handleSubmit(e)
                    }}
                    noValidate
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">EQRO Contract details</legend>

                        {shouldValidate && (
                            <ErrorSummary
                                errors={genecontractErrorsummaryErrors(
                                    errors,
                                    values
                                )}
                                headingRef={errorSummaryHeadingRef}
                            />
                        )}

                        <FormGroup
                            error={Boolean(
                                showFieldErrors(
                                    'contractDocuments',
                                    errors
                                )
                            )}
                            className="margin-top-0"
                        >
                            <FileUpload
                                id="contractDocuments"
                                name="contractDocuments"
                                label="Upload contract"
                                aria-required
                                error={showFieldErrors(
                                    'contractDocuments',
                                    errors
                                )}
                                hint={
                                    <span
                                        className={
                                            styles.guidanceTextBlock
                                        }
                                    >
                                        <LinkWithLogging
                                            aria-label="Document definitions and requirements (opens in new window)"
                                            href={
                                                '/help#key-documents'
                                            }
                                            variant="external"
                                            target="_blank"
                                        >
                                            Document definitions and
                                            requirements
                                        </LinkWithLogging>
                                        <span className="mcr-note padding-top-05">
                                            Supporting documents can
                                            be added later. If you
                                            have additional contract
                                            actions, you must submit
                                            them in a separate
                                            submission.
                                        </span>
                                        <span className="usa-hint padding-top-1">
                                            This input only accepts
                                            PDF, CSV, DOC, DOCX,
                                            XLS, XLSX files.
                                        </span>
                                    </span>
                                }
                                accept={
                                    ACCEPTED_SUBMISSION_FILE_TYPES
                                }
                                initialItems={fileItemsFromDraftSubmission(
                                    'contract'
                                )}
                                uploadFile={(file) =>
                                    handleUploadFile(
                                        file,
                                        'HEALTH_PLAN_DOCS'
                                    )
                                }
                                scanFile={(key) =>
                                    handleScanFile(
                                        key,
                                        'HEALTH_PLAN_DOCS'
                                    )
                                }
                                onFileItemsUpdate={({
                                    fileItems,
                                }) =>
                                    setFieldValue(
                                        `contractDocuments`,
                                        fileItems
                                    )
                                }
                            />
                        </FormGroup>

                        {hideSupportingDocs && (
                            <FormGroup
                                error={Boolean(
                                    showFieldErrors(
                                        'supportingDocuments',
                                        errors
                                    )
                                )}
                            >
                                <FileUpload
                                    id="supportingDocuments"
                                    name="supportingDocuments"
                                    label="Upload contract-supporting documents"
                                    error={showFieldErrors(
                                        'supportingDocuments',
                                        errors
                                    )}
                                    hint={
                                        <span
                                            className={
                                                styles.guidanceTextBlock
                                            }
                                        >
                                            <LinkWithLogging
                                                aria-label="Document definitions and requirements (opens in new window)"
                                                href={
                                                    '/help#supporting-documents'
                                                }
                                                variant="external"
                                                target="_blank"
                                            >
                                                Document definitions
                                                and requirements
                                            </LinkWithLogging>
                                            <span className="mcr-note padding-top-05">
                                                Upload any
                                                supporting documents
                                                related to the
                                                contract.
                                            </span>
                                            <span className="usa-hint padding-top-1">
                                                This input only
                                                accepts PDF, CSV,
                                                DOC, DOCX, XLS, XLSX
                                                files.
                                            </span>
                                        </span>
                                    }
                                    accept={
                                        ACCEPTED_SUBMISSION_FILE_TYPES
                                    }
                                    initialItems={fileItemsFromDraftSubmission(
                                        'supporting'
                                    )}
                                    uploadFile={(file) =>
                                        handleUploadFile(
                                            file,
                                            'HEALTH_PLAN_DOCS'
                                        )
                                    }
                                    scanFile={(key) =>
                                        handleScanFile(
                                            key,
                                            'HEALTH_PLAN_DOCS'
                                        )
                                    }
                                    onFileItemsUpdate={({
                                        fileItems,
                                    }) =>
                                        setFieldValue(
                                            `supportingDocuments`,
                                            fileItems
                                        )
                                    }
                                />
                            </FormGroup>
                        )}

                        {
                            <>
                                <FormGroup
                                    error={
                                        Boolean(
                                            showFieldErrors(
                                                'contractDateStart',
                                                errors
                                            )
                                        ) ||
                                        Boolean(
                                            showFieldErrors(
                                                'contractDateEnd',
                                                errors
                                            )
                                        )
                                    }
                                >
                                    <Fieldset
                                        aria-required
                                        legend={
                                            isContractAmendment(
                                                draftSubmission
                                            )
                                                ? 'Amendment effective dates'
                                                : 'Contract effective dates'
                                        }
                                    >
                                        <span
                                            className={
                                                styles.requiredOptionalText
                                            }
                                        >
                                            Required
                                        </span>
                                        {Boolean(
                                            showFieldErrors(
                                                'contractDateStart',
                                                errors
                                            ) ||
                                                Boolean(
                                                    showFieldErrors(
                                                        'contractDateEnd',
                                                        errors
                                                    )
                                                )
                                        ) && (
                                            <ContractDatesErrorMessage
                                                values={values}
                                                validationErrorMessage={
                                                    errors.contractDateStart ||
                                                    errors.contractDateEnd ||
                                                    'Invalid date'
                                                }
                                                formFieldLabel={
                                                    isContractAmendment(
                                                        draftSubmission
                                                    )
                                                        ? 'Amendment effective dates'
                                                        : 'Contract effective dates'
                                                }
                                            />
                                        )}
                                        <LinkWithLogging
                                            aria-label="Effective date guidance (opens in new window)"
                                            href={
                                                '/help#effective-date-guidance'
                                            }
                                            variant="external"
                                            target="_blank"
                                        >
                                            Effective date guidance
                                        </LinkWithLogging>
                                        <DateRangePicker
                                            className={
                                                styles.dateRangePicker
                                            }
                                            startDateHint="mm/dd/yyyy"
                                            startDateLabel="Start date"
                                            startDatePickerProps={{
                                                id: 'contractDateStart',
                                                name: 'contractDateStart',
                                                'aria-required':
                                                    true,
                                                disabled: false,
                                                defaultValue:
                                                    values.contractDateStart,
                                                maxDate:
                                                    formattedDateMinusOneDay(
                                                        values.contractDateEnd
                                                    ),
                                                onChange: (val) =>
                                                    setFieldValue(
                                                        'contractDateStart',
                                                        formatUserInputDate(
                                                            val
                                                        )
                                                    ),
                                            }}
                                            endDateHint="mm/dd/yyyy"
                                            endDateLabel="End date"
                                            endDatePickerProps={{
                                                disabled: false,
                                                id: 'contractDateEnd',
                                                name: 'contractDateEnd',
                                                'aria-required':
                                                    true,
                                                defaultValue:
                                                    values.contractDateEnd,
                                                minDate:
                                                    formattedDatePlusOneDay(
                                                        values.contractDateStart
                                                    ),
                                                onChange: (val) =>
                                                    setFieldValue(
                                                        'contractDateEnd',
                                                        formatUserInputDate(
                                                            val
                                                        )
                                                    ),
                                            }}
                                        />
                                    </Fieldset>
                                </FormGroup>
                                {isBaseContract && isMCO && (
                                    <FormGroup
                                        error={Boolean(
                                            showFieldErrors(
                                                'eqroNewContractor',
                                                errors
                                            )
                                        )}
                                    >
                                        <Fieldset
                                            aria-required
                                            id="eqroNewContractor"
                                            legend="Is this contract with a new EQRO contractor?"
                                        >
                                            <span
                                                className={
                                                    styles.requiredOptionalText
                                                }
                                            >
                                                Required
                                            </span>
                                            <FieldYesNo
                                                id="eqroNewContractor"
                                                name="eqroNewContractor"
                                                label="Is this contract with a new EQRO contractor?"
                                                showError={Boolean(
                                                    showFieldErrors(
                                                        'eqroNewContractor',
                                                        errors
                                                    )
                                                )}
                                                legendStyle="srOnly"
                                            />
                                        </Fieldset>
                                    </FormGroup>
                                )}
                                {!isBaseContract && isMCO && (
                                    <FormGroup
                                        error={Boolean(
                                            showFieldErrors(
                                                'eqroProvisionMcoEqrOrRelatedActivities',
                                                errors
                                            )
                                        )}
                                    >
                                        <Fieldset
                                            aria-required
                                            id="eqroProvisionMcoEqrOrRelatedActivities"
                                            legend="EQR or EQR-related activities performed on MCOs"
                                        >
                                            <span
                                                className={
                                                    styles.requiredOptionalText
                                                }
                                            >
                                                Required
                                            </span>
                                            <FieldYesNo
                                                id="eqroProvisionMcoEqrOrRelatedActivities"
                                                name="eqroProvisionMcoEqrOrRelatedActivities"
                                                label="EQR or EQR-related activities performed on MCOs"
                                                showError={Boolean(
                                                    showFieldErrors(
                                                        'eqroProvisionMcoEqrOrRelatedActivities',
                                                        errors
                                                    )
                                                )}
                                                legendStyle="srOnly"
                                            />
                                        </Fieldset>
                                    </FormGroup>
                                )}
                                {((!isBaseContract && isMCO && values.eqroProvisionMcoEqrOrRelatedActivities === "YES") || (isBaseContract && isMCO))  && (
                                <FormGroup
                                    error={Boolean(
                                        showFieldErrors(
                                            'eqroProvisionMcoNewOptionalActivity',
                                            errors
                                        )
                                    )}
                                >
                                    <Fieldset
                                        aria-required
                                        id="eqroProvisionMcoNewOptionalActivity"
                                        legend="New optional activities to be performed on MCO in accordance with 42 CFR $ 438.358(c)"
                                    >
                                        <span
                                            className={
                                                styles.requiredOptionalText
                                            }
                                        >
                                            Required
                                        </span>
                                        <FieldYesNo
                                            id="eqroProvisionMcoNewOptionalActivity"
                                            name="eqroProvisionMcoNewOptionalActivity"
                                            label="New optional activities to be performed on MCO in accordance with 42 CFR $ 438.358(c)"
                                            showError={Boolean(
                                                showFieldErrors(
                                                    'eqroProvisionMcoNewOptionalActivity',
                                                    errors
                                                )
                                            )}
                                            legendStyle="srOnly"
                                        />
                                    </Fieldset>
                                </FormGroup>
                                )}
                                {((!isBaseContract && isMCO && values.eqroProvisionMcoEqrOrRelatedActivities === "YES") || (isBaseContract && isMCO)) && (
                                    <FormGroup
                                        error={Boolean(
                                            showFieldErrors(
                                                'eqroProvisionNewMcoEqrRelatedActivities',
                                                errors
                                            )
                                        )}
                                    >
                                        <Fieldset
                                            aria-required
                                            id="eqroProvisionNewMcoEqrRelatedActivities"
                                            legend="EQR-related activities for a new MCO managed care program"
                                        >
                                            <span
                                                className={
                                                    styles.requiredOptionalText
                                                }
                                            >
                                                Required
                                            </span>
                                            <FieldYesNo
                                                id="eqroProvisionNewMcoEqrRelatedActivities"
                                                name="eqroProvisionNewMcoEqrRelatedActivities"
                                                label="EQR-related activities for a new MCO managed care program"
                                                showError={Boolean(
                                                    showFieldErrors(
                                                        'eqroProvisionNewMcoEqrRelatedActivities',
                                                        errors
                                                    )
                                                )}
                                                legendStyle="srOnly"
                                            />
                                        </Fieldset>
                                    </FormGroup>
                                )}
                                {isChipPopulation && (
                                    <FormGroup
                                        error={Boolean(
                                            showFieldErrors(
                                                'eqroProvisionChipEqrRelatedActivities',
                                                errors
                                            )
                                        )}
                                    >
                                        <Fieldset
                                            aria-required
                                            id="eqroProvisionChipEqrRelatedActivities"
                                            legend="EQR-related activities performed on the CHIP population"
                                        >
                                            <span
                                                className={
                                                    styles.requiredOptionalText
                                                }
                                            >
                                                Required
                                            </span>
                                            <FieldYesNo
                                                id="eqroProvisionChipEqrRelatedActivities"
                                                name="eqroProvisionChipEqrRelatedActivities"
                                                label="EQR-related activities performed on the CHIP population"
                                                showError={Boolean(
                                                    showFieldErrors(
                                                        'eqroProvisionChipEqrRelatedActivities',
                                                        errors
                                                    )
                                                )}
                                                legendStyle="srOnly"
                                            />
                                        </Fieldset>
                                    </FormGroup>
                                )}
                            </>
                        }
                    </fieldset>
                    <PageActions
                        backOnClick={async () => {
                            // Save data before going back
                            await handleFormSubmit(values, setSubmitting, {
                                type: 'BACK',
                                redirectPath: 'SUBMISSIONS_TYPE',
                            })
                        }}
                        continueOnClick={() => {
                            // Trigger validation and submit (which saves and navigates)
                            setShouldValidate(true)
                            setFocusErrorSummaryHeading(true)
                            handleSubmit()  // ← This triggers Formik's onSubmit, which calls handleFormSubmit with type: 'CONTINUE'
                        }}
                        saveAsDraftOnClick={async () => {
                            await handleFormSubmit(values, setSubmitting, {
                                type: 'SAVE_AS_DRAFT',
                            })
                        }}
                        disableContinue={shouldValidate && !!Object.keys(errors).length}
                        actionInProgress={isSubmitting}
                        backOnClickUrl={submissionDetailsPath}
                        continueOnClickUrl={contactsPagePath}
                    />
                </UswdsForm>
                </>
                    )
                    }}
                    
                </Formik> 
            </FormContainer>
        </div>
    )
}
