import React from 'react'
import { Fieldset, FormGroup, Form as UswdsForm } from '@trussworks/react-uswds'
import {
    FieldArray,
    FieldArrayRenderProps,
    Formik,
    FormikErrors,
    getIn,
} from 'formik'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import styles from '../StateSubmissionForm.module.scss'

import {
    ActuaryCommunicationType,
    ActuaryContact,
    RateInfoType,
} from '../../../common-code/healthPlanFormDataType'

import {
    DynamicStepIndicator,
    ErrorSummary,
    FieldRadio,
    PoliteErrorMessage,
} from '../../../components'
import { formatFormDateForDomain } from '../../../formHelpers'
import { RateDetailsFormSchema } from './RateDetailsSchema'
import { PageActions } from '../PageActions'
import {
    activeFormPages,
    type HealthPlanFormPageProps,
} from '../StateSubmissionForm'
import {
    useCurrentRoute,
    useFocus,
    useHealthPlanPackageForm,
    useRouteParams,
} from '../../../hooks'

import {
    formatActuaryContactsForForm,
    formatAddtlActuaryContactsForForm,
    formatDocumentsForDomain,
    formatDocumentsForForm,
    formatForForm,
} from '../../../formHelpers/formatters'
import { RateCertFormType, SingleRateCert } from './SingleRateCert'
import { useS3 } from '../../../contexts/S3Context'
import { S3ClientT } from '../../../s3'
import { isLoadingOrHasFileErrors } from '../../../components/FileUpload'
import { RoutesRecord } from '../../../constants'
import { SectionCard } from '../../../components/SectionCard'
import { FormContainer } from '../FormContainer'
import { useAuth } from '../../../contexts/AuthContext'
import { ErrorOrLoadingPage } from '../ErrorOrLoadingPage'
import { PageBannerAlerts } from '../PageBannerAlerts'
import { useErrorSummary } from '../../../hooks/useErrorSummary'

// This function is used to get initial form values as well return empty form values when we add a new rate or delete a rate
// We need to include the getKey function in params because there are no guarantees currently file is in s3 even if when we load data from API
const generateRateCertFormValues = (params?: {
    rateInfo: RateInfoType
    getKey: S3ClientT['getKey']
}): RateCertFormType => {
    const rateInfo = params?.rateInfo

    return {
        id: rateInfo?.id ?? uuidv4(),
        key: uuidv4(),
        rateType: rateInfo?.rateType,
        rateCapitationType: rateInfo?.rateCapitationType,
        rateDateStart: formatForForm(rateInfo?.rateDateStart),
        rateDateEnd: formatForForm(rateInfo?.rateDateEnd),
        rateDateCertified: formatForForm(rateInfo?.rateDateCertified),
        effectiveDateStart: formatForForm(
            rateInfo?.rateAmendmentInfo?.effectiveDateStart
        ),
        effectiveDateEnd: formatForForm(
            rateInfo?.rateAmendmentInfo?.effectiveDateEnd
        ),
        rateProgramIDs: rateInfo?.rateProgramIDs ?? [],
        rateDocuments: params
            ? formatDocumentsForForm({
                  documents: rateInfo?.rateDocuments,
                  getKey: params.getKey,
              })
            : [],
        supportingDocuments: params
            ? formatDocumentsForForm({
                  documents: rateInfo?.supportingDocuments,
                  getKey: params.getKey,
              })
            : [],
        actuaryContacts: formatActuaryContactsForForm(
            rateInfo?.actuaryContacts
        ),
        addtlActuaryContacts: formatAddtlActuaryContactsForForm(
            rateInfo?.addtlActuaryContacts
        ),
        actuaryCommunicationPreference:
            rateInfo?.actuaryCommunicationPreference,
        packagesWithSharedRateCerts:
            rateInfo?.packagesWithSharedRateCerts ?? [],
        hasSharedRateCert:
            rateInfo?.packagesWithSharedRateCerts === undefined
                ? undefined
                : (rateInfo?.packagesWithSharedRateCerts &&
                        rateInfo?.packagesWithSharedRateCerts.length) >= 1
                  ? 'YES'
                  : 'NO',
    }
}

interface RateInfoArrayType {
    rateInfos: RateCertFormType[]
    actuaryCommunicationPreference: ActuaryCommunicationType | undefined
}

export const rateErrorHandling = (
    error: string | FormikErrors<RateCertFormType> | undefined
): FormikErrors<RateCertFormType> | undefined => {
    if (typeof error === 'string') {
        return undefined
    }
    return error
}

export const RateDetails = ({
    showValidations = false,
}: HealthPlanFormPageProps): React.ReactElement => {
    const navigate = useNavigate()
    const { getKey } = useS3()

    // set up API handling and HPP data
    const { loggedInUser } = useAuth()
    const { currentRoute } = useCurrentRoute()
    const { id } = useRouteParams()
    const {
        draftSubmission,
        interimState,
        updateDraft,
        previousDocuments = [],
        showPageErrorMessage,
        unlockInfo,
    } = useHealthPlanPackageForm(id)
    const { setFocusErrorSummaryHeading, errorSummaryHeadingRef } =
        useErrorSummary()
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)

    // multi-rates state management
    const [focusNewRate, setFocusNewRate] = React.useState(false)
    const newRateNameRef = React.useRef<HTMLElement | null>(null)
    const [newRateButtonRef, setNewRateButtonFocus] = useFocus() // This ref.current is always the same element

    const rateDetailsFormSchema = RateDetailsFormSchema()

    React.useEffect(() => {
        if (focusNewRate) {
            newRateNameRef?.current?.focus()
            setFocusNewRate(false)
            newRateNameRef.current = null
        }
    }, [focusNewRate])

    if (interimState || !draftSubmission || !updateDraft)
        return <ErrorOrLoadingPage state={interimState || 'GENERIC_ERROR'} />
    const rateInfosInitialValues: RateInfoArrayType = {
        rateInfos:
            draftSubmission.rateInfos.length > 0
                ? draftSubmission.rateInfos.map((rateInfo) =>
                      generateRateCertFormValues({ rateInfo, getKey })
                  )
                : [generateRateCertFormValues()],
        actuaryCommunicationPreference:
            draftSubmission.addtlActuaryCommunicationPreference
                ? draftSubmission.addtlActuaryCommunicationPreference
                : undefined,
    }

    const handleFormSubmit = async (
        form: RateInfoArrayType,
        setSubmitting: (isSubmitting: boolean) => void, // formik setSubmitting
        options: {
            shouldValidateDocuments: boolean
            redirectPath: string
        }
    ) => {
        const { rateInfos, actuaryCommunicationPreference } = form

        if (options.shouldValidateDocuments) {
            const fileErrorsNeedAttention = rateInfos.some((rateInfo) =>
                isLoadingOrHasFileErrors(
                    rateInfo.supportingDocuments.concat(rateInfo.rateDocuments)
                )
            )
            if (fileErrorsNeedAttention) {
                // make inline field errors visible so user can correct documents, direct user focus to errors, and manually exit formik submit
                setShouldValidate(true)
                setFocusErrorSummaryHeading(true)
                setSubmitting(false)
                return
            }
        }

        const cleanedRateInfos = rateInfos.map((rateInfo) => {
            return {
                id: rateInfo.id,
                rateType: rateInfo.rateType,
                rateCapitationType: rateInfo.rateCapitationType,
                rateDocuments: formatDocumentsForDomain(rateInfo.rateDocuments),
                supportingDocuments: formatDocumentsForDomain(
                    rateInfo.supportingDocuments
                ),
                rateDateStart: formatFormDateForDomain(rateInfo.rateDateStart),
                rateDateEnd: formatFormDateForDomain(rateInfo.rateDateEnd),
                rateDateCertified: formatFormDateForDomain(
                    rateInfo.rateDateCertified
                ),
                rateAmendmentInfo:
                    rateInfo.rateType === 'AMENDMENT'
                        ? {
                              effectiveDateStart: formatFormDateForDomain(
                                  rateInfo.effectiveDateStart
                              ),
                              effectiveDateEnd: formatFormDateForDomain(
                                  rateInfo.effectiveDateEnd
                              ),
                          }
                        : undefined,
                rateProgramIDs: rateInfo.rateProgramIDs,
                actuaryContacts: rateInfo.actuaryContacts,
                addtlActuaryContacts: rateInfo.addtlActuaryContacts,
                actuaryCommunicationPreference: actuaryCommunicationPreference,
                packagesWithSharedRateCerts:
                    rateInfo.hasSharedRateCert === 'YES'
                        ? rateInfo.packagesWithSharedRateCerts
                        : [],
            }
        })

        draftSubmission.rateInfos = cleanedRateInfos

        const addtlActuaryContacts: ActuaryContact[] = []
        rateInfos.forEach((rateInfo) => {
            rateInfo.addtlActuaryContacts.forEach((contact) => {
                addtlActuaryContacts.push(contact)
            })
        })
        draftSubmission.addtlActuaryContacts = addtlActuaryContacts

        draftSubmission.addtlActuaryCommunicationPreference =
            actuaryCommunicationPreference

        try {
            const updatedSubmission = await updateDraft(draftSubmission)
            if (updatedSubmission instanceof Error) {
                setSubmitting(false)
                console.info(
                    'Error updating draft submission: ',
                    updatedSubmission
                )
            } else if (updatedSubmission) {
                navigate(options.redirectPath)
            }
        } catch (serverError) {
            setSubmitting(false)
        }
    }

    // Due to multi-rates we have extra handling around how error summary apperas
    // Error summary object keys will be used as DOM focus point from error-summary. Must be valid html selector
    // Error summary object values will be used as messages displays in error summary
    const generateErrorSummaryErrors = (
        errors: FormikErrors<RateInfoArrayType>
    ) => {
        const rateErrors = errors.rateInfos
        const actuaryCommunicationPreference =
            errors.actuaryCommunicationPreference
        const errorObject: { [field: string]: string } = {}

        if (rateErrors && Array.isArray(rateErrors)) {
            rateErrors.forEach((rateError, index) => {
                if (!rateError) return

                Object.entries(rateError).forEach(([field, value]) => {
                    if (typeof value === 'string') {
                        //rateProgramIDs error message needs a # proceeding the key name because this is the only way to be able to link to the Select component element see comments in ErrorSummaryMessage component.
                        const errorKey =
                            field === 'rateProgramIDs' ||
                            field === 'packagesWithSharedRateCerts'
                                ? `#rateInfos.${index}.${field}`
                                : `rateInfos.${index}.${field}`
                        errorObject[errorKey] = value
                    }
                    // If the field is actuaryContacts then the value should be an array with at least one object of errors
                    if (
                        field === 'actuaryContacts' &&
                        Array.isArray(value) &&
                        Array.length > 0
                    ) {
                        //Currently, rate certifications only have 1 actuary contact
                        const actuaryContact = value[0]
                        Object.entries(actuaryContact).forEach(
                            ([contactField, contactValue]) => {
                                if (typeof contactValue === 'string') {
                                    const errorKey = `rateInfos.${index}.actuaryContacts.0.${contactField}`
                                    errorObject[errorKey] = contactValue
                                }
                            }
                        )
                    }
                })
            })
        }

        if (actuaryCommunicationPreference) {
            errorObject['actuaryCommunicationPreference'] =
                actuaryCommunicationPreference
        }

        return errorObject
    }
    const showFieldErrors = (error?: string | undefined) =>
        shouldValidate && Boolean(error)

    return (
        <>
            <div className={styles.stepIndicator}>
                <DynamicStepIndicator
                    formPages={activeFormPages(draftSubmission)}
                    currentFormPage={currentRoute}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={unlockInfo}
                    showPageErrorMessage={showPageErrorMessage ?? false}
                />
            </div>
            <FormContainer id="state-submission-form-page">
                <Formik
                    initialValues={rateInfosInitialValues}
                    onSubmit={(
                        { rateInfos, actuaryCommunicationPreference },
                        { setSubmitting }
                    ) => {
                        return handleFormSubmit(
                            { rateInfos, actuaryCommunicationPreference },
                            setSubmitting,
                            {
                                shouldValidateDocuments: true,
                                redirectPath: `../contacts`,
                            }
                        )
                    }}
                    validationSchema={rateDetailsFormSchema}
                >
                    {({
                        values: { rateInfos, actuaryCommunicationPreference },
                        errors,
                        dirty,
                        handleSubmit,
                        isSubmitting,
                        setSubmitting,
                    }) => {
                        return (
                            <>
                                <UswdsForm
                                    className={styles.formContainer}
                                    id="RateDetailsForm"
                                    aria-label="Rate Details Form"
                                    aria-describedby="form-guidance"
                                    onSubmit={(e) => {
                                        setShouldValidate(true)
                                        setFocusErrorSummaryHeading(true)
                                        handleSubmit(e)
                                    }}
                                >
                                    <fieldset className="usa-fieldset with-sections">
                                        <legend className="srOnly">
                                            Rate Details
                                        </legend>

                                        {shouldValidate && (
                                            <ErrorSummary
                                                errors={generateErrorSummaryErrors(
                                                    errors
                                                )}
                                                headingRef={
                                                    errorSummaryHeadingRef
                                                }
                                            />
                                        )}
                                        <FieldArray name="rateInfos">
                                            {({
                                                remove,
                                                push,
                                            }: FieldArrayRenderProps) => (
                                                <>
                                                    {rateInfos.map(
                                                        (rateInfo, index) => (
                                                            <SingleRateCert
                                                                key={
                                                                    rateInfo.key
                                                                }
                                                                rateInfo={
                                                                    rateInfo
                                                                }
                                                                index={index}
                                                                shouldValidate={
                                                                    shouldValidate
                                                                }
                                                                parentSubmissionID={
                                                                    draftSubmission.id
                                                                }
                                                                previousDocuments={
                                                                    previousDocuments
                                                                }
                                                                multiRatesConfig={{
                                                                    removeSelf:
                                                                        () => {
                                                                            remove(
                                                                                index
                                                                            )
                                                                            setNewRateButtonFocus()
                                                                        },
                                                                    reassignNewRateRef:
                                                                        (el) =>
                                                                            (newRateNameRef.current =
                                                                                el),
                                                                }}
                                                            />
                                                        )
                                                    )}
                                                    <SectionCard>
                                                        <h3>
                                                            Additional rate
                                                            certification
                                                        </h3>
                                                        <button
                                                            type="button"
                                                            className={`usa-button usa-button--outline ${styles.addRateBtn}`}
                                                            onClick={() => {
                                                                const newRate =
                                                                    generateRateCertFormValues()
                                                                push(newRate)
                                                                setFocusNewRate(
                                                                    true
                                                                )
                                                            }}
                                                            ref={
                                                                newRateButtonRef
                                                            }
                                                        >
                                                            Add another rate
                                                            certification
                                                        </button>
                                                    </SectionCard>
                                                </>
                                            )}
                                        </FieldArray>
                                        <SectionCard>
                                            <FormGroup
                                                error={showFieldErrors(
                                                    errors.actuaryCommunicationPreference
                                                )}
                                            >
                                                <Fieldset
                                                    className={
                                                        styles.radioGroup
                                                    }
                                                    legend="Actuaries' communication preference"
                                                    role="radiogroup"
                                                    aria-required
                                                >
                                                    <span
                                                        className={
                                                            styles.requiredOptionalText
                                                        }
                                                        style={{
                                                            marginBottom:
                                                                '10px',
                                                        }}
                                                    >
                                                        Required
                                                    </span>
                                                    <span
                                                        className={
                                                            styles.requiredOptionalText
                                                        }
                                                    >
                                                        Communication preference
                                                        between CMS Office of
                                                        the Actuary (OACT) and
                                                        all state’s actuaries
                                                        (i.e. certifying
                                                        actuaries and additional
                                                        actuary contacts)
                                                    </span>
                                                    <PoliteErrorMessage>
                                                        {showFieldErrors(
                                                            errors.actuaryCommunicationPreference
                                                        ) &&
                                                            getIn(
                                                                errors,
                                                                'actuaryCommunicationPreference'
                                                            )}
                                                    </PoliteErrorMessage>
                                                    <FieldRadio
                                                        id={`OACTtoActuary`}
                                                        name={`actuaryCommunicationPreference`}
                                                        label={`OACT can communicate directly with the state's actuaries but should copy the state on all written communication and all appointments for verbal discussions.`}
                                                        value={
                                                            'OACT_TO_ACTUARY'
                                                        }
                                                        aria-required
                                                    />
                                                    <FieldRadio
                                                        id={`OACTtoState`}
                                                        name={`actuaryCommunicationPreference`}
                                                        label={`OACT can communicate directly with the state, and the state will relay all written communication to their actuaries and set up time for any potential verbal discussions.`}
                                                        value={'OACT_TO_STATE'}
                                                        aria-required
                                                    />
                                                </Fieldset>
                                            </FormGroup>
                                        </SectionCard>
                                    </fieldset>
                                    <PageActions
                                        backOnClick={async () => {
                                            const redirectPath = `../contract-details`
                                            if (dirty) {
                                                await handleFormSubmit(
                                                    {
                                                        rateInfos,
                                                        actuaryCommunicationPreference,
                                                    },
                                                    setSubmitting,
                                                    {
                                                        shouldValidateDocuments:
                                                            false,
                                                        redirectPath,
                                                    }
                                                )
                                            } else {
                                                navigate(redirectPath)
                                            }
                                        }}
                                        saveAsDraftOnClick={async () => {
                                            await handleFormSubmit(
                                                {
                                                    rateInfos,
                                                    actuaryCommunicationPreference,
                                                },
                                                setSubmitting,
                                                {
                                                    shouldValidateDocuments:
                                                        true,
                                                    redirectPath:
                                                        RoutesRecord.DASHBOARD_SUBMISSIONS,
                                                }
                                            )
                                        }}
                                        disableContinue={
                                            shouldValidate &&
                                            !!Object.keys(errors).length
                                        }
                                        actionInProgress={isSubmitting}
                                    />
                                </UswdsForm>
                            </>
                        )
                    }}
                </Formik>
            </FormContainer>
        </>
    )
}
