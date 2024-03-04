import React from 'react'
import { Button, Fieldset, Form as UswdsForm } from '@trussworks/react-uswds'
import { FieldArray, FieldArrayRenderProps, Formik, FormikErrors } from 'formik'
import { useNavigate } from 'react-router-dom'

import styles from '../../StateSubmissionForm.module.scss'
import {
    DynamicStepIndicator,
    ErrorSummary,
    SectionCard,
} from '../../../../components'
import { RateDetailsFormSchema } from '../RateDetailsSchema'
import { PageActions } from '../../PageActions'

import {
    formatActuaryContactsForForm,
    formatDocumentsForForm,
    formatDocumentsForGQL,
    formatForForm,
    formatFormDateForGQL,
} from '../../../../formHelpers/formatters'
import { useS3 } from '../../../../contexts/S3Context'
import { S3ClientT } from '../../../../s3'
import {
    FileItemT,
    isLoadingOrHasFileErrors,
} from '../../../../components/FileUpload'
import {
    RouteT,
    RoutesRecord,
    STATE_SUBMISSION_FORM_ROUTES,
} from '../../../../constants'
import {
    Rate,
    RateFormDataInput,
    RateRevision,
    useFetchContractQuery,
    useFetchRateQuery,
} from '../../../../gen/gqlClient'
import { SingleRateCertV2 } from './SingleRateCertV2'
import type { SubmitRateHandler } from '../../../RateEdit/RateEdit'
import { useFocus, useRouteParams } from '../../../../hooks'
import { useErrorSummary } from '../../../../hooks/useErrorSummary'
import { PageBannerAlerts } from '../../PageBannerAlerts'
import { useAuth } from '../../../../contexts/AuthContext'
import {
    ErrorOrLoadingPage,
    handleAndReturnErrorState,
} from '../../ErrorOrLoadingPage'

export type RateDetailFormValues = {
    id?: string // no id if its a new rate
    rateType: RateRevision['formData']['rateType']
    rateCapitationType: RateRevision['formData']['rateCapitationType']
    rateDateStart: RateRevision['formData']['rateDateStart']
    rateDateEnd: RateRevision['formData']['rateDateEnd']
    rateDateCertified: RateRevision['formData']['rateDateCertified']
    effectiveDateStart: RateRevision['formData']['amendmentEffectiveDateStart']
    effectiveDateEnd: RateRevision['formData']['amendmentEffectiveDateEnd']
    rateProgramIDs: RateRevision['formData']['rateProgramIDs']
    rateDocuments: FileItemT[]
    supportingDocuments: FileItemT[]
    actuaryContacts: RateRevision['formData']['certifyingActuaryContacts']
    addtlActuaryContacts: RateRevision['formData']['addtlActuaryContacts']
    actuaryCommunicationPreference: RateRevision['formData']['actuaryCommunicationPreference']
    packagesWithSharedRateCerts: RateRevision['formData']['packagesWithSharedRateCerts']
}

// We have a list of rates to enable multi-rate behavior
export type RateDetailFormConfig = {
    rates: RateDetailFormValues[]
}

const generateFormValues = (
    getKey: S3ClientT['getKey'],
    rateRev?: RateRevision,
    rateID?: string
): RateDetailFormValues => {
    const rateInfo = rateRev?.formData

    return {
        id: rateID,
        rateType: rateInfo?.rateType ?? undefined,
        rateCapitationType: rateInfo?.rateCapitationType ?? undefined,
        rateDateStart: formatForForm(rateInfo?.rateDateStart),
        rateDateEnd: formatForForm(rateInfo?.rateDateEnd),
        rateDateCertified: formatForForm(rateInfo?.rateDateCertified),
        effectiveDateStart: formatForForm(
            rateInfo?.amendmentEffectiveDateStart
        ),
        effectiveDateEnd: formatForForm(rateInfo?.amendmentEffectiveDateEnd),
        rateProgramIDs: rateInfo?.rateProgramIDs ?? [],
        rateDocuments: formatDocumentsForForm({
            documents: rateInfo?.rateDocuments,
            getKey: getKey,
        }),
        supportingDocuments: formatDocumentsForForm({
            documents: rateInfo?.supportingDocuments,
            getKey: getKey,
        }),
        actuaryContacts: formatActuaryContactsForForm(
            rateInfo?.certifyingActuaryContacts
        ),
        addtlActuaryContacts: formatActuaryContactsForForm(
            rateInfo?.certifyingActuaryContacts
        ),
        actuaryCommunicationPreference:
            rateInfo?.actuaryCommunicationPreference ?? undefined,
        packagesWithSharedRateCerts:
            rateInfo?.packagesWithSharedRateCerts ?? [],
    }
}

export const rateErrorHandling = (
    error: string | FormikErrors<RateDetailFormValues> | undefined
): FormikErrors<RateDetailFormValues> | undefined => {
    if (typeof error === 'string') {
        return undefined
    }
    return error
}

type RateDetailsV2Props = {
    type: 'SINGLE' | 'MULTI'
    showValidations?: boolean
    submitRate?: SubmitRateHandler
}
const RateDetailsV2 = ({
    showValidations = false,
    type,
    submitRate,
}: RateDetailsV2Props): React.ReactElement => {
    const navigate = useNavigate()
    const { getKey } = useS3()
    const displayAsStandaloneRate = type === 'SINGLE'
    const { loggedInUser } = useAuth()
    // Form validation
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const rateDetailsFormSchema = RateDetailsFormSchema({
        'rate-edit-unlock': true,
        // Add linked rates logic
    })
    const { setFocusErrorSummaryHeading, errorSummaryHeadingRef } =
        useErrorSummary()

    // Multi-rates state management
    const [focusNewRate, setFocusNewRate] = React.useState(false)
    const newRateNameRef = React.useRef<HTMLElement | null>(null)
    const [newRateButtonRef, setNewRateButtonFocus] = useFocus() // This ref.current is always the same element
    const { id } = useRouteParams()

    // API requests
    const {
        data: fetchContractData,
        loading: fetchContractLoading,
        error: fetchContractError,
    } = useFetchContractQuery({
        variables: {
            input: {
                contractID: id ?? 'unknown-contract',
            },
        },
        skip: displayAsStandaloneRate,
    })

    const {
        data: fetchRateData,
        loading: fetchRateLoading,
        error: fetchRateError,
    } = useFetchRateQuery({
        variables: {
            input: {
                rateID: id ?? 'unknown-rate',
            },
        },
        skip: !displayAsStandaloneRate,
    })
    const ratesFromContract =
        fetchContractData?.fetchContract.contract.draftRates
    const initialRequestLoading = fetchContractLoading || fetchRateLoading
    const initialRequestError = fetchContractError || fetchRateError
    const previousDocuments: string[] = []

    React.useEffect(() => {
        if (focusNewRate) {
            newRateNameRef?.current?.focus()
            setFocusNewRate(false)
            newRateNameRef.current = null
        }
    }, [focusNewRate])

    /*
    Set up initial rate form values for Formik
        if contract rates exist, use those (relevant for multi rate forms on contract package submission form)
        if standalone rates exist, use those (for a standalone rate edits)
        otherwise, generate a new  list of empty rate form values
    */
    const rates: Rate[] = React.useMemo(
        () =>
            ratesFromContract ??
            (fetchRateData?.fetchRate.rate && [
                fetchRateData?.fetchRate.rate,
            ]) ??
            [],
        [ratesFromContract, fetchRateData]
    )
    const initialValues: RateDetailFormConfig = {
        rates:
            rates.length > 0
                ? rates.map((rate) =>
                      generateFormValues(
                          getKey,
                          rate.draftRevision ?? undefined,
                          rate?.id
                      )
                  )
                : [generateFormValues(getKey)],
    }

    // Display any full page interim state resulting from the initial fetch API requests
    if (initialRequestLoading) {
        return <ErrorOrLoadingPage state="LOADING" />
    }
    if (initialRequestError) {
        return (
            <ErrorOrLoadingPage
                state={handleAndReturnErrorState(initialRequestError)}
            />
        )
    }

    const handlePageAction = async (
        rates: RateDetailFormValues[],
        setSubmitting: (isSubmitting: boolean) => void, // formik setSubmitting
        options: {
            type: 'SAVE_AS_DRAFT' | 'CANCEL' | 'CONTINUE'
            redirectPath: RouteT
        }
    ) => {
        if (options.type === 'CONTINUE') {
            const fileErrorsNeedAttention = rates.some((rateForm) =>
                isLoadingOrHasFileErrors(
                    rateForm.supportingDocuments.concat(rateForm.rateDocuments)
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

        const gqlFormDatas: Array<{ id?: string } & RateFormDataInput> =
            rates.map((form) => {
                return {
                    id: form.id,
                    rateType: form.rateType,
                    rateCapitationType: form.rateCapitationType,
                    rateDocuments: formatDocumentsForGQL(form.rateDocuments),
                    supportingDocuments: formatDocumentsForGQL(
                        form.supportingDocuments
                    ),
                    rateDateStart: formatFormDateForGQL(form.rateDateStart),
                    rateDateEnd: formatFormDateForGQL(form.rateDateEnd),
                    rateDateCertified: formatFormDateForGQL(
                        form.rateDateCertified
                    ),
                    amendmentEffectiveDateStart: formatFormDateForGQL(
                        form.effectiveDateStart
                    ),
                    amendmentEffectiveDateEnd: formatFormDateForGQL(
                        form.effectiveDateEnd
                    ),
                    rateProgramIDs: form.rateProgramIDs,
                    certifyingActuaryContacts: form.actuaryContacts,
                    addtlActuaryContacts: form.addtlActuaryContacts,
                    actuaryCommunicationPreference:
                        form.actuaryCommunicationPreference,
                    packagesWithSharedRateCerts:
                        form.packagesWithSharedRateCerts,
                }
            })

        const { id, ...formData } = gqlFormDatas[0] // only grab the first rate in the array because multi-rates functionality not added yet. This will be part of Link Rates epic

        if (options.type === 'CONTINUE' && id && submitRate) {
            await submitRate(id, formData, setSubmitting, 'DASHBOARD')
        } else if (options.type === 'CONTINUE' && !id) {
            throw new Error(
                'Rate create and update for a new rate is not yet implemented. This will be part of Link Rates epic.'
            )
        } else if (options.type === 'SAVE_AS_DRAFT') {
            throw new Error(
                'Rate save as draft is not possible. This will be part of Link Rates epic.'
            )
        } else {
            navigate(RoutesRecord[options.redirectPath])
        }
    }

    // Due to multi-rates we have extra handling around how error summary appears
    // Error summary object keys will be used as DOM focus point from error-summary. Must be valid html selector
    // Error summary object values will be used as messages displays in error summary
    const generateErrorSummaryErrors = (
        errors: FormikErrors<RateDetailFormConfig>
    ) => {
        const rateErrors = errors.rates
        const errorObject: { [field: string]: string } = {}
        if (rateErrors && Array.isArray(rateErrors)) {
            rateErrors.forEach((rateError, index) => {
                if (!rateError) return

                Object.entries(rateError).forEach(([field, value]) => {
                    if (typeof value === 'string') {
                        //rateProgramIDs error message needs a # proceeding the key name because this is the only way to be able to link to the Select component element see comments in ErrorSummaryMessage component.
                        const errorKey =
                            field === 'rateProgramIDs'
                                ? `#rates.${index}.${field}`
                                : `rates.${index}.${field}`
                        errorObject[errorKey] = value
                    }
                    // If the field is actuaryContacts then the value should be an array with at least one object of errors
                    if (
                        field === 'actuaryContacts' &&
                        Array.isArray(value) &&
                        Array.length > 0
                    ) {
                        // Rate certifications only have 1 certifying actuary contact
                        const actuaryContact = value[0]
                        Object.entries(actuaryContact).forEach(
                            ([contactField, contactValue]) => {
                                if (typeof contactValue === 'string') {
                                    const errorKey = `rates.${index}.actuaryContacts.0.${contactField}`
                                    errorObject[errorKey] = contactValue
                                }
                            }
                        )
                    }
                })
            })
        }

        return errorObject
    }

    return (
        <>
            <div className={styles.stepIndicator}>
                {!displayAsStandaloneRate && (
                    <DynamicStepIndicator
                        formPages={STATE_SUBMISSION_FORM_ROUTES}
                        currentFormPage="SUBMISSIONS_RATE_DETAILS"
                    />
                )}
                {!displayAsStandaloneRate && (
                    <PageBannerAlerts
                        loggedInUser={loggedInUser}
                        unlockedInfo={
                            fetchContractData?.fetchContract.contract
                                .draftRevision?.unlockInfo
                        }
                        showPageErrorMessage={false} // TODO FIGURE OUT ERROR BANNER FOR BOTH MULTI AND STANDALONE USE CASE
                    />
                )}
            </div>
            <Formik
                initialValues={initialValues}
                onSubmit={(rateFormValues, { setSubmitting }) => {
                    return handlePageAction(
                        rateFormValues.rates,
                        setSubmitting,
                        {
                            type: 'CONTINUE',
                            redirectPath: 'DASHBOARD_SUBMISSIONS',
                        }
                    )
                }}
                validationSchema={rateDetailsFormSchema}
            >
                {({
                    values: { rates },
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
                                id="SingleRateDetailsForm"
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
                                            headingRef={errorSummaryHeadingRef}
                                        />
                                    )}
                                    <FieldArray name="rates">
                                        {({
                                            remove,
                                            push,
                                        }: FieldArrayRenderProps) => (
                                            <>
                                                {rates.map(
                                                    (rate, index = 0) => (
                                                        <SectionCard
                                                            key={index}
                                                        >
                                                            <h3
                                                                className={
                                                                    styles.rateName
                                                                }
                                                            >
                                                                {displayAsStandaloneRate
                                                                    ? `Rate certification`
                                                                    : `Rate certification ${index + 1}`}
                                                            </h3>
                                                            <Fieldset
                                                                data-testid={`rate-certification-form`}
                                                            >
                                                                <SingleRateCertV2
                                                                    rateForm={
                                                                        rate
                                                                    }
                                                                    index={
                                                                        index
                                                                    }
                                                                    shouldValidate={
                                                                        shouldValidate
                                                                    }
                                                                    previousDocuments={
                                                                        previousDocuments
                                                                    }
                                                                />
                                                                {index >= 1 &&
                                                                    !displayAsStandaloneRate && (
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
                                                                                setNewRateButtonFocus()
                                                                            }}
                                                                        >
                                                                            Remove
                                                                            rate
                                                                            certification
                                                                        </Button>
                                                                    )}
                                                            </Fieldset>
                                                        </SectionCard>
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
                                                                generateFormValues(
                                                                    getKey
                                                                )

                                                            push(newRate)
                                                            setFocusNewRate(
                                                                true
                                                            )
                                                        }}
                                                        ref={newRateButtonRef}
                                                    >
                                                        Add another rate
                                                        certification
                                                    </button>
                                                </SectionCard>
                                            </>
                                        )}
                                    </FieldArray>
                                </fieldset>
                                <PageActions
                                    pageVariant={
                                        displayAsStandaloneRate
                                            ? 'STANDALONE'
                                            : undefined
                                    }
                                    backOnClick={async () => {
                                        if (dirty) {
                                            await handlePageAction(
                                                rates,
                                                setSubmitting,
                                                {
                                                    type: 'CANCEL',
                                                    redirectPath:
                                                        'DASHBOARD_SUBMISSIONS',
                                                }
                                            )
                                        } else {
                                            navigate(
                                                RoutesRecord.DASHBOARD_SUBMISSIONS
                                            )
                                        }
                                    }}
                                    saveAsDraftOnClick={
                                        displayAsStandaloneRate
                                            ? () => undefined
                                            : async () => {
                                                  await handlePageAction(
                                                      rates,
                                                      setSubmitting,
                                                      {
                                                          type: 'SAVE_AS_DRAFT',
                                                          redirectPath:
                                                              'DASHBOARD_SUBMISSIONS',
                                                      }
                                                  )
                                              }
                                    }
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
        </>
    )
}
export { RateDetailsV2 }
