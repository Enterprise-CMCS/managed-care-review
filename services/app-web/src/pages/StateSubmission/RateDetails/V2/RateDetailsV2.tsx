import React, { useEffect, useState } from 'react'
import { Fieldset, Form as UswdsForm } from '@trussworks/react-uswds'
import { FieldArray, FieldArrayRenderProps, Formik, FormikErrors } from 'formik'
import { generatePath, useNavigate } from 'react-router-dom'

import styles from '../../StateSubmissionForm.module.scss'
import {
    ButtonWithLogging,
    DynamicStepIndicator,
    ErrorSummary,
    FormNotificationContainer,
    SectionCard,
} from '../../../../components'
import { RateDetailsFormSchema } from '../RateDetailsSchema'
import { PageActions } from '../../PageActions'

import { useS3 } from '../../../../contexts/S3Context'
import {
    FileItemT,
    isLoadingOrHasFileErrors,
} from '../../../../components/FileUpload'
import {
    RouteT,
    RoutesRecord,
    STATE_SUBMISSION_FORM_ROUTES,
    STATE_SUBMISSION_FORM_ROUTES_WITHOUT_SUPPORTING_DOCS,
} from '@mc-review/constants'
import {
    HealthPlanPackageStatus,
    Rate,
    RateRevision,
    useFetchContractQuery,
    useFetchRateQuery,
    useSubmitRateMutation,
    useUpdateDraftContractRatesMutation,
} from '../../../../gen/gqlClient'
import { SingleRateFormFields } from '../SingleRateFormFields'
import { useFocus, useRouteParams } from '../../../../hooks'
import { useErrorSummary } from '../../../../hooks/useErrorSummary'
import { PageBannerAlerts } from '../../PageBannerAlerts'
import { useAuth } from '../../../../contexts/AuthContext'
import {
    ErrorOrLoadingPage,
    handleAndReturnErrorState,
} from '../../ErrorOrLoadingPage'
import { featureFlags } from '@mc-review/common-code'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { recordJSException } from '@mc-review/otel'
import {
    convertGQLRateToRateForm,
    convertRateFormToGQLRateFormData,
    generateUpdatedRates,
} from '../rateDetailsHelpers'
import { LinkYourRates } from '../../../LinkYourRates/LinkYourRates'
import { LinkedRateSummary } from '../LinkedRateSummary'
import { usePage } from '../../../../contexts/PageContext'
import { InfoTag } from '../../../../components/InfoTag/InfoTag'

export type FormikRateForm = {
    id?: string // no id if its a new rate
    status?: HealthPlanPackageStatus // need to track status to know if this is a direct child or linked rate
    rateCertificationName?: string // need to know rate name if this rate is a linked rate
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
    ratePreviouslySubmitted?: 'YES' | 'NO'
    initiallySubmittedAt?: Date
    linkRateSelect?: string
}

// We have a list of rates to enable multi-rate behavior
export type RateDetailFormConfig = {
    rateForms: FormikRateForm[]
}

type RateDetailsProps = {
    type: 'SINGLE' | 'MULTI'
    showValidations?: boolean
}
const RateDetails = ({
    showValidations = false,
    type,
}: RateDetailsProps): React.ReactElement => {
    const navigate = useNavigate()
    const { getKey } = useS3()
    const displayAsStandaloneRate = type === 'SINGLE'
    const { loggedInUser } = useAuth()
    const ldClient = useLDClient()
    const { updateHeading } = usePage()

    const useEditUnlockRate = ldClient?.variation(
        featureFlags.RATE_EDIT_UNLOCK.flag,
        featureFlags.RATE_EDIT_UNLOCK.defaultValue
    )

    const hideSupportingDocs = ldClient?.variation(
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.flag,
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.defaultValue
    )
    const [showAPIErrorBanner, setShowAPIErrorBanner] = useState<
        boolean | string
    >(false) // string is a custom error message, defaults to generic message when true

    // Form validation
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const rateDetailsFormSchema = RateDetailsFormSchema(
        {
            'rate-edit-unlock': useEditUnlockRate,
        },
        !displayAsStandaloneRate
    )

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

    useEffect(() => {
        if (focusNewRate) {
            newRateNameRef?.current?.focus()
            setFocusNewRate(false)
            newRateNameRef.current = null
        }
    }, [focusNewRate])

    // Set up data for form. Either based on contract API (for multi rate) or rates API (for edit and submit of standalone rate)
    const contract = fetchContractData?.fetchContract.contract
    const contractDraftRevision = contract?.draftRevision
    const ratesFromContract = contract?.draftRates
    const initialRequestLoading = fetchContractLoading || fetchRateLoading
    const initialRequestError = fetchContractError || fetchRateError
    const withdrawnRateRevisions: RateRevision[] =
        contract?.withdrawnRates?.reduce((acc, rate) => {
            const latestRevision = rate.packageSubmissions?.[0].rateRevision
            if (rate.consolidatedStatus === 'WITHDRAWN' && latestRevision) {
                acc.push(latestRevision)
            }
            return acc
        }, [] as RateRevision[]) ?? []

    const pageHeading = displayAsStandaloneRate
        ? fetchRateData?.fetchRate.rate.draftRevision?.formData
              .rateCertificationName
        : contract?.draftRevision?.contractName
    if (pageHeading) updateHeading({ customHeading: pageHeading })
    const [updateDraftContractRates] = useUpdateDraftContractRatesMutation()
    const [submitRate] = useSubmitRateMutation()

    // Set up initial rate form values for Formik
    const initialRates: Rate[] = React.useMemo(
        () =>
            // if contract rates exist, use those (relevant for multi rate forms)
            ratesFromContract ??
            // if standalone rates exist, use those (for a standalone rate edits)
            (fetchRateData?.fetchRate.rate && [
                fetchRateData?.fetchRate.rate,
            ]) ??
            [],
        [ratesFromContract, fetchRateData]
    )

    const initialRateForm: FormikRateForm[] =
        initialRates.length > 0
            ? initialRates.map((rate) =>
                  convertGQLRateToRateForm(getKey, rate, contract?.id)
              )
            : [convertGQLRateToRateForm(getKey)]

    const initialValues: RateDetailFormConfig = {
        rateForms: initialRateForm,
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
    // Redirect if in standalone rate workflow and rate not editable
    if (displayAsStandaloneRate && initialRates[0].status !== 'UNLOCKED') {
        navigate(`/rates/${id}`)
    }

    const handlePageAction = async (
        rateForms: FormikRateForm[],
        setSubmitting: (isSubmitting: boolean) => void, // formik setSubmitting
        options: {
            type: 'SAVE_AS_DRAFT' | 'CANCEL' | 'CONTINUE'
            redirectPath: RouteT
        }
    ) => {
        setShowAPIErrorBanner(false)
        if (options.type === 'CONTINUE') {
            const fileErrorsNeedAttention = rateForms.some((rateForm) =>
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

        if (displayAsStandaloneRate && options.type === 'CONTINUE') {
            try {
                await submitRate({
                    variables: {
                        input: {
                            rateID: id ?? 'no-id',
                            formData: convertRateFormToGQLRateFormData(
                                rateForms[0]
                            ), // only grab the first rate in the array for standalone rate submission
                        },
                    },
                    fetchPolicy: 'network-only',
                })
                navigate(
                    generatePath(RoutesRecord[options.redirectPath], { id: id })
                )
            } catch (err) {
                recordJSException(
                    `RateDetails: Apollo error reported. Error message: Failed to create form data ${err}`
                )
                setShowAPIErrorBanner(true)
            } finally {
                setSubmitting(false)
            }
        } else if (
            !displayAsStandaloneRate &&
            (options.type === 'CONTINUE' || options.type === 'SAVE_AS_DRAFT')
        ) {
            try {
                const formattedRateForms = rateForms.filter((rate) => {
                    if (rate.ratePreviouslySubmitted === 'YES') {
                        return rate.id
                    } else {
                        return rate
                    }
                })
                const updatedRates = generateUpdatedRates(formattedRateForms)
                await updateDraftContractRates({
                    variables: {
                        input: {
                            contractID: id ?? 'no-id',
                            lastSeenUpdatedAt: contractDraftRevision?.updatedAt,
                            updatedRates,
                        },
                    },
                    fetchPolicy: 'network-only',
                })
                navigate(
                    generatePath(RoutesRecord[options.redirectPath], { id })
                )
            } catch (err) {
                recordJSException(
                    `RateDetails: Apollo error reported. Error message: Failed to create form data ${err}`
                )
                setShowAPIErrorBanner(true)
            } finally {
                setSubmitting(false)
            }
            // At this point know there was a back or cancel page action - we are just redirecting
        } else {
            navigate(generatePath(RoutesRecord[options.redirectPath], { id }))
        }
    }

    // Due to multi-rates we have extra handling around how error summary appears
    // Error summary object keys will be used as DOM focus point from error-summary. Must be valid html selector
    // Error summary object values will be used as messages displays in error summary
    const generateErrorSummaryErrors = (
        errors: FormikErrors<RateDetailFormConfig>
    ) => {
        const rateErrors = errors.rateForms
        const errorObject: { [field: string]: string } = {}
        if (rateErrors && Array.isArray(rateErrors)) {
            rateErrors.forEach((rateError, index) => {
                if (!rateError) return
                Object.entries(rateError).forEach(([field, value]) => {
                    if (typeof value === 'string') {
                        // select dropdown component error messages needs a # proceeding the key name because this is the only way to be able to link to react-select based components. See comments in ErrorSummaryMessage component.
                        const errorKey =
                            field === 'rateProgramIDs' ||
                            field === 'linkRateSelect'
                                ? `#rateForms.${index}.${field}`
                                : `rateForms.${index}.${field}`
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
                                    const errorKey = `rateForms.${index}.actuaryContacts.0.${contactField}`
                                    errorObject[errorKey] = contactValue
                                }
                            }
                        )
                    }

                    // If the field is addtlActuaryContacts, then it should be an array.
                    if (
                        field === 'addtlActuaryContacts' &&
                        Array.isArray(value)
                    ) {
                        // Loops through every additional certifying actuary and adds each actuary field with an error to
                        // the errorObject.
                        value.forEach((contact, contactIndex) => {
                            if (!contact) return

                            Object.entries(contact).forEach(
                                ([field, value]) => {
                                    const errorKey = `rateForms.${index}.addtlActuaryContacts.${contactIndex}.${field}`
                                    if (typeof value === 'string') {
                                        errorObject[errorKey] = value
                                    }
                                }
                            )
                        })
                    }
                })
            })
        }

        return errorObject
    }

    const fieldNamePrefix = (idx: number) => `rateForms.${idx}`

    const displayRemoveRateBtn = (index: number, rateForm: FormikRateForm) => {
        if (index >= 1 && !displayAsStandaloneRate) {
            //We expect to display the button regardless of status if the rate is a linked rate
            if (
                rateForm.ratePreviouslySubmitted === 'YES' ||
                rateForm.status !== 'UNLOCKED'
            ) {
                return true
            }
        }

        return false
    }

    return (
        <>
            <FormNotificationContainer>
                {!displayAsStandaloneRate && (
                    <DynamicStepIndicator
                        formPages={
                            hideSupportingDocs
                                ? STATE_SUBMISSION_FORM_ROUTES_WITHOUT_SUPPORTING_DOCS
                                : STATE_SUBMISSION_FORM_ROUTES
                        }
                        currentFormPage="SUBMISSIONS_RATE_DETAILS"
                    />
                )}
                {!displayAsStandaloneRate && (
                    <PageBannerAlerts
                        loggedInUser={loggedInUser}
                        unlockedInfo={
                            contract?.draftRevision?.unlockInfo ||
                            fetchRateData?.fetchRate.rate.draftRevision
                                ?.unlockInfo
                        }
                        showPageErrorMessage={showAPIErrorBanner}
                    />
                )}
            </FormNotificationContainer>

            <Formik
                initialValues={initialValues}
                onSubmit={(rateFormValues, { setSubmitting }) =>
                    handlePageAction(rateFormValues.rateForms, setSubmitting, {
                        type: 'CONTINUE',
                        redirectPath: displayAsStandaloneRate
                            ? 'DASHBOARD_SUBMISSIONS'
                            : 'SUBMISSIONS_CONTACTS',
                    })
                }
                validationSchema={rateDetailsFormSchema}
            >
                {({
                    values: { rateForms },
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
                                noValidate
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
                                    <FieldArray name="rateForms">
                                        {({
                                            remove,
                                            push,
                                            replace,
                                        }: FieldArrayRenderProps) => (
                                            <>
                                                {rateForms.map(
                                                    (rateForm, index = 0) => (
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
                                                                {!displayAsStandaloneRate && (
                                                                    <LinkYourRates
                                                                        fieldNamePrefix={fieldNamePrefix(
                                                                            index
                                                                        )}
                                                                        index={
                                                                            index
                                                                        }
                                                                        autofill={(
                                                                            rateForm: FormikRateForm
                                                                        ) => {
                                                                            return replace(
                                                                                index,
                                                                                rateForm
                                                                            )
                                                                        }}
                                                                        shouldValidate={
                                                                            shouldValidate
                                                                        }
                                                                    />
                                                                )}
                                                                {!displayAsStandaloneRate &&
                                                                    rateForm.ratePreviouslySubmitted ===
                                                                        'YES' &&
                                                                    rateForm.id && (
                                                                        <LinkedRateSummary
                                                                            rateForm={
                                                                                rateForm
                                                                            }
                                                                        />
                                                                    )}

                                                                {(displayAsStandaloneRate ||
                                                                    rateForm.ratePreviouslySubmitted ===
                                                                        'NO') && (
                                                                    <SingleRateFormFields
                                                                        rateForm={
                                                                            rateForm
                                                                        }
                                                                        index={
                                                                            index
                                                                        }
                                                                        fieldNamePrefix={fieldNamePrefix(
                                                                            index
                                                                        )}
                                                                        shouldValidate={
                                                                            shouldValidate
                                                                        }
                                                                    />
                                                                )}
                                                                {displayRemoveRateBtn(
                                                                    index,
                                                                    rateForm
                                                                ) && (
                                                                    <ButtonWithLogging
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
                                                                    </ButtonWithLogging>
                                                                )}
                                                            </Fieldset>
                                                        </SectionCard>
                                                    )
                                                )}
                                                {!displayAsStandaloneRate && (
                                                    <SectionCard>
                                                        <h3>
                                                            Additional rate
                                                            certification
                                                        </h3>
                                                        <button // using button element so ref works.
                                                            type="button"
                                                            className={`usa-button usa-button--outline ${styles.addRateBtn}`}
                                                            onClick={() => {
                                                                const newRate =
                                                                    convertGQLRateToRateForm(
                                                                        getKey
                                                                    ) // empty rate

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
                                                )}
                                                {withdrawnRateRevisions.length >
                                                    0 &&
                                                    withdrawnRateRevisions.map(
                                                        (rateRev) => (
                                                            <SectionCard
                                                                id={`withdrawn-rate-${rateRev.id}`}
                                                                key={rateRev.id}
                                                            >
                                                                <h3
                                                                    aria-label={`Rate ID: ${rateRev.formData.rateCertificationName}`}
                                                                    className={
                                                                        styles.rateName
                                                                    }
                                                                >
                                                                    <InfoTag color="gray-medium">
                                                                        WITHDRAWN
                                                                    </InfoTag>{' '}
                                                                    {
                                                                        rateRev
                                                                            .formData
                                                                            .rateCertificationName
                                                                    }
                                                                </h3>
                                                            </SectionCard>
                                                        )
                                                    )}
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
                                                rateForms,
                                                setSubmitting,
                                                {
                                                    type: 'CANCEL',
                                                    redirectPath:
                                                        displayAsStandaloneRate
                                                            ? 'DASHBOARD_SUBMISSIONS'
                                                            : 'SUBMISSIONS_CONTRACT_DETAILS',
                                                }
                                            )
                                        } else {
                                            navigate(
                                                displayAsStandaloneRate
                                                    ? RoutesRecord.DASHBOARD_SUBMISSIONS
                                                    : '../contract-details'
                                            )
                                        }
                                    }}
                                    saveAsDraftOnClick={
                                        displayAsStandaloneRate
                                            ? () => undefined
                                            : async () => {
                                                  await handlePageAction(
                                                      rateForms,
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
                                    backOnClickUrl={
                                        displayAsStandaloneRate
                                            ? RoutesRecord.DASHBOARD_SUBMISSIONS
                                            : generatePath(
                                                  RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS,
                                                  { id }
                                              )
                                    }
                                    saveAsDraftOnClickUrl={
                                        RoutesRecord.DASHBOARD_SUBMISSIONS
                                    }
                                    continueOnClickUrl={
                                        displayAsStandaloneRate
                                            ? RoutesRecord.DASHBOARD_SUBMISSIONS
                                            : '/edit/contacts'
                                    }
                                />
                            </UswdsForm>
                        </>
                    )
                }}
            </Formik>
        </>
    )
}
export { RateDetails }
