import React, { useEffect, useState } from 'react'
import { FieldArray, FieldArrayRenderProps, Formik, FormikErrors } from 'formik'
import * as Yup from 'yup'
import { Form as UswdsForm, FormGroup } from '@trussworks/react-uswds'
import {
    ButtonWithLogging,
    DynamicStepIndicator,
    ErrorSummary,
    FileItemT,
    FileUpload,
    FormContainer,
    FormNotificationContainer,
    PageActions,
} from '../../../../components'
import { ACCEPTED_SUBMISSION_FILE_TYPES } from '../../../../components/FileUpload'
import { usePage } from '../../../../contexts/PageContext'
import { useAuth } from '../../../../contexts/AuthContext'
import { useErrorSummary } from '../../../../hooks/useErrorSummary'
import styles from '../../StateSubmissionForm.module.scss'
import { LinkContractSelect } from '../../../LinkYourRates/LinkContractSelect/LinkContractSelect'
import { useS3 } from '../../../../contexts/S3Context'
import { IndexContractsStrippedInput, useIndexContractsStrippedQuery } from '../../../../gen/gqlClient'
import { PageBannerAlerts } from '../../SharedSubmissionComponents'

export type SDPDetailsFormValues = {
    sdpDocuments: FileItemT[]
    linkContractSelects: string[]
}

type SDPDetailsProps = {
    initialValues?: SDPDetailsFormValues
    onBack: () => void
    onContinue: (values: SDPDetailsFormValues) => void | Promise<void>
    pageErrorMessage?: string | boolean
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

    if (
        Array.isArray(errors.linkContractSelects) &&
        typeof errors.linkContractSelects[0] === 'string'
    ) {
        summaryErrors['#linkContractSelect-0'] = errors.linkContractSelects[0]
    }

    return summaryErrors
}

export const sdpDetailsInitialValues: SDPDetailsFormValues = {
    sdpDocuments: [],
    linkContractSelects: [''],
}

const sdpDetailsSchema = Yup.object().shape({
    sdpDocuments: Yup.array(),
    linkContractSelects: Yup.array().of(Yup.string()),
})

export const SDPDetails = ({
    initialValues = sdpDetailsInitialValues,
    onBack,
    onContinue,
    pageErrorMessage = false,
}: SDPDetailsProps): React.ReactElement => {
    const { updateActiveMainContent } = usePage()
    const { loggedInUser } = useAuth()
    const { errorSummaryHeadingRef } = useErrorSummary()
    const [shouldValidate, setShouldValidate] = useState(false)
    const activeMainContentId = 'sdpDetailsMainContent'
    const { handleUploadFile, handleScanFile } = useS3()
    const stateCode =
        loggedInUser?.__typename === 'StateUser'
            ? loggedInUser.state.code
            : undefined
    const contractsInput: IndexContractsStrippedInput = {
        stateCode,
    }
    const { data: contractsData } = useIndexContractsStrippedQuery({
        variables: { input: contractsInput },
        skip: !stateCode,
    })

    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)
    const availableContractsCount =
        contractsData?.indexContractsStripped.edges
            .map((edge) => edge.node)
            .filter((contract) => contract.consolidatedStatus !== 'WITHDRAWN')
            .length ?? 0

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
                    currentFormPage="SUBMISSIONS_SDP_DETAILS"
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                        SUBMISSIONS_SDP_DETAILS: 'SDP details',
                        SUBMISSIONS_SDP_CONTACTS: 'Contacts',
                        SUBMISSIONS_SDP_REVIEW_SUBMIT: 'Review and submit',
                    }}
                />
                <PageBannerAlerts showPageErrorMessage={pageErrorMessage} />
            </FormNotificationContainer>

            <FormContainer id="SDPDetails">
                <Formik
                    initialValues={initialValues}
                    validationSchema={sdpDetailsSchema}
                    onSubmit={async (values) => {
                        setShouldValidate(true)
                        await onContinue(values)
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

                                <FieldArray name="linkContractSelects">
                                    {({ push, remove }: FieldArrayRenderProps) => (
                                        <FormGroup
                                            error={Boolean(
                                                Array.isArray(
                                                    errors.linkContractSelects
                                                ) &&
                                                    errors.linkContractSelects.some(
                                                        (error) =>
                                                            showFieldErrors(
                                                                error
                                                            )
                                                    )
                                            )}
                                        >
                                            <label
                                                className="usa-label"
                                                htmlFor="linkContractSelect-0"
                                                style={{
                                                    marginBottom: '12px',
                                                }}
                                            >
                                                Which contract(s) does this SDP
                                                relate to?
                                            </label>
                                            {values.linkContractSelects.map(
                                                (linkedContract, index) => (
                                                    <div
                                                        key={`linked-contract-${index}`}
                                                        className={
                                                            index > 0
                                                                ? 'margin-top-3'
                                                                : undefined
                                                        }
                                                    >
                                                        <LinkContractSelect
                                                            name={`linkContractSelects.${index}`}
                                                            initialValue={
                                                                linkedContract ||
                                                                undefined
                                                            }
                                                            inputId={`linkContractSelect-${index}`}
                                                            label="Which contract(s) does this SDP relate to?"
                                                            alreadySelected={values.linkContractSelects.filter(
                                                                (value, valueIndex) =>
                                                                    valueIndex !==
                                                                    index
                                                            )}
                                                        />
                                                        {index > 0 && (
                                                            <ButtonWithLogging
                                                                type="button"
                                                                unstyled
                                                                className={
                                                                    styles.removeContactBtn
                                                                }
                                                                onClick={() =>
                                                                    remove(
                                                                        index
                                                                    )
                                                                }
                                                            >
                                                                Remove contract
                                                            </ButtonWithLogging>
                                                        )}
                                                    </div>
                                                )
                                            )}

                                            {values.linkContractSelects
                                                .length <
                                                availableContractsCount && (
                                                <button
                                                    type="button"
                                                    className={`usa-button usa-button--outline margin-top-3 ${styles.addRateBtn}`}
                                                    onClick={() => push('')}
                                                >
                                                    Add additional contract
                                                </button>
                                            )}
                                        </FormGroup>
                                    )}
                                </FieldArray>
                            </fieldset>

                            <PageActions
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
