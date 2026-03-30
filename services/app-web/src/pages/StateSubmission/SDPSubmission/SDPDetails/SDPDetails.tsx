import React, { useEffect, useState } from 'react'
import { Formik, FormikErrors } from 'formik'
import * as Yup from 'yup'
import { Form as UswdsForm, FormGroup } from '@trussworks/react-uswds'
import {
    DynamicStepIndicator,
    ErrorSummary,
    FileItemT,
    FileUpload,
    FormContainer,
    FormNotificationContainer,
    PageActions,
    PoliteErrorMessage,
} from '../../../../components'
import { ACCEPTED_SUBMISSION_FILE_TYPES } from '../../../../components/FileUpload'
import { usePage } from '../../../../contexts/PageContext'
import { useErrorSummary } from '../../../../hooks/useErrorSummary'
import styles from '../../StateSubmissionForm.module.scss'
import { LinkContractSelect } from '../../../LinkYourRates/LinkContractSelect/LinkContractSelect'
import { useS3 } from '../../../../contexts/S3Context'

type SDPDetailsFormValues = {
    sdpDocuments: FileItemT[]
    linkContractSelect: string
}

type SDPDetailsProps = {
    onBack: () => void
}

type FormError =
    FormikErrors<SDPDetailsFormValues>[keyof FormikErrors<SDPDetailsFormValues>]

const generateErrorSummaryErrors = (
    errors: FormikErrors<SDPDetailsFormValues>
): { [field: string]: string | string[] } => {
    const summaryErrors: { [field: string]: string | string[] } = {}

    if (typeof errors.sdpDocuments === 'string') {
        summaryErrors.sdpDocuments = errors.sdpDocuments
    }

    if (typeof errors.linkContractSelect === 'string') {
        summaryErrors['#linkContractSelect'] = errors.linkContractSelect
    }

    return summaryErrors
}

const initialValues: SDPDetailsFormValues = {
    sdpDocuments: [],
    linkContractSelect: '',
}

const sdpDetailsSchema = Yup.object().shape({
    sdpDocuments: Yup.array().min(
        1,
        'You must upload at least one SDP document'
    ),
    linkContractSelect: Yup.string().required(
        'You must select at least one related contract'
    ),
})

export const SDPDetails = ({ onBack }: SDPDetailsProps): React.ReactElement => {
    const { updateActiveMainContent } = usePage()
    const { errorSummaryHeadingRef } = useErrorSummary()
    const [shouldValidate, setShouldValidate] = useState(false)
    const activeMainContentId = 'sdpDetailsMainContent'
    const { handleUploadFile, handleScanFile } = useS3()

    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={[
                        'SUBMISSIONS_TYPE',
                        'SUBMISSIONS_CONTRACT_DETAILS',
                    ]}
                    currentFormPage="SUBMISSIONS_CONTRACT_DETAILS"
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                        SUBMISSIONS_CONTRACT_DETAILS: 'SDP details',
                    }}
                />
            </FormNotificationContainer>

            <FormContainer id="SDPDetails">
                <Formik
                    initialValues={initialValues}
                    validationSchema={sdpDetailsSchema}
                    onSubmit={async () => {
                        setShouldValidate(true)
                    }}
                >
                    {({ errors, handleSubmit, values, setFieldValue }) => (
                        <UswdsForm
                            className={styles.formContainer}
                            id="SDPDetailsForm"
                            aria-label="SDP details form"
                            onSubmit={(e) => {
                                setShouldValidate(true)
                                return handleSubmit(e)
                            }}
                        >
                            {shouldValidate && (
                                <ErrorSummary
                                    errors={generateErrorSummaryErrors(errors)}
                                    headingRef={errorSummaryHeadingRef}
                                />
                            )}

                            <h1 className="margin-top-0 margin-bottom-4">
                                SDP details
                            </h1>
                            <fieldset className="usa-fieldset">
                                <legend className="srOnly">SDP details</legend>

                                <FormGroup
                                    error={showFieldErrors(errors.sdpDocuments)}
                                    className="margin-top-0"
                                >
                                    <FileUpload
                                        id="sdpDocuments"
                                        name="sdpDocuments"
                                        label="SDP documents"
                                        aria-required
                                        error={
                                            showFieldErrors(errors.sdpDocuments)
                                                ? (errors.sdpDocuments as string)
                                                : undefined
                                        }
                                        hint={
                                            <span className="usa-hint">
                                                This input only accepts PDF,
                                                CSV, DOC, DOCX, XLS, XLSX files.
                                            </span>
                                        }
                                        accept={ACCEPTED_SUBMISSION_FILE_TYPES}
                                        initialItems={values.sdpDocuments}
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
                                        onFileItemsUpdate={({ fileItems }) =>
                                            void setFieldValue(
                                                'sdpDocuments',
                                                fileItems
                                            )
                                        }
                                    />
                                </FormGroup>

                                <FormGroup
                                    error={showFieldErrors(
                                        errors.linkContractSelect
                                    )}
                                >
                                    <label
                                        className="usa-label"
                                        htmlFor="linkContractSelect"
                                        style={{ marginBottom: '12px' }}
                                    >
                                        Which contract(s) does this SDP relate
                                        to?
                                    </label>
                                    {showFieldErrors(
                                        errors.linkContractSelect
                                    ) && (
                                        <PoliteErrorMessage formFieldLabel="Which contract(s) does this SDP relate to?">
                                            {
                                                errors.linkContractSelect as string
                                            }
                                        </PoliteErrorMessage>
                                    )}
                                    <LinkContractSelect
                                        name="linkContractSelect"
                                        initialValue={
                                            values.linkContractSelect ||
                                            undefined
                                        }
                                        inputId="linkContractSelect"
                                        label="Which contract(s) does this SDP relate to?"
                                    />
                                </FormGroup>
                            </fieldset>

                            <PageActions
                                pageVariant="LAST"
                                backOnClick={onBack}
                                continueOnClick={() => setShouldValidate(true)}
                            />
                        </UswdsForm>
                    )}
                </Formik>
            </FormContainer>
        </div>
    )
}
