import React, { useEffect } from 'react'
import { Form as UswdsForm } from '@trussworks/react-uswds'
import { FieldArray, FieldArrayRenderProps, Formik, FormikErrors } from 'formik'
import { useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import styles from '../StateSubmissionForm.module.scss'

import { RateInfoType } from '../../../common-code/healthPlanFormDataType'

import { ErrorSummary, GenericApiErrorBanner } from '../../../components'
import { formatFormDateForDomain } from '../../../formHelpers'
import { RateDetailsFormSchema } from './RateDetailsSchema'
import { PageActions } from '../PageActions'
import { useFocus } from '../../../hooks'

import {
    formatActuaryContactsForForm,
    formatDocumentsForDomain,
    formatDocumentsForForm,
    formatForForm,
} from '../../../formHelpers/formatters'
import {
    RateCertFormType,
    SingleRateCert,
} from './SingleRateCert/SingleRateCert'
import { useS3 } from '../../../contexts/S3Context'
import { S3ClientT } from '../../../s3'
import { isLoadingOrHasFileErrors } from '../../../components/FileUpload'
import { RoutesRecord } from '../../../constants'
import { SectionCard } from '../../../components/SectionCard'
import { Rate, RateRevision, useFetchRateQuery, useSubmitRateMutation } from '../../../gen/gqlClient'

// This function is used to get initial form values as well return empty form values when we add a new rate or delete a rate
// We need to include the getKey function in params because there are no guarantees currently file is in s3 even if when we load data from API
const generateRateCertFormValues = (
    getKey: S3ClientT['getKey'],
    rateRev?: RateRevision): RateCertFormType => {
    const rateInfo = rateRev?.formData
    const newRateID =  uuidv4();

    return {
        id: rateRev?.id ?? newRateID,
        key: rateRev?.id ?? newRateID,
        rateType: rateInfo?.rateType ?? undefined,
        rateCapitationType: rateInfo?.rateCapitationType ?? undefined,
        rateDateStart: formatForForm(rateInfo?.rateDateStart),
        rateDateEnd: formatForForm(rateInfo?.rateDateEnd),
        rateDateCertified: formatForForm(rateInfo?.rateDateCertified),
        effectiveDateStart: formatForForm(
            rateInfo?.amendmentEffectiveDateStart
        ),
        effectiveDateEnd: formatForForm(
            rateInfo?.amendmentEffectiveDateEnd
        ),
        rateProgramIDs: rateInfo?.rateProgramIDs ?? [],
        rateDocuments: formatDocumentsForForm({
                  documents: rateInfo?.rateDocuments,
                  getKey: getKey,
        }),
        supportingDocuments:formatDocumentsForForm({
                  documents: rateInfo?.supportingDocuments,
                  getKey: getKey,
              }),
        actuaryContacts: formatActuaryContactsForForm(
            rateInfo?.certifyingActuaryContacts
        ),
        actuaryCommunicationPreference:
            rateInfo?.actuaryCommunicationPreference ?? undefined,
        packagesWithSharedRateCerts:
            rateInfo?.packagesWithSharedRateCerts ?? [],
    }
}

interface RateInfoArrayType {
    rateInfos: RateCertFormType[]
}

export const rateErrorHandling = (
    error: string | FormikErrors<RateCertFormType> | undefined
): FormikErrors<RateCertFormType> | undefined => {
    if (typeof error === 'string') {
        return undefined
    }
    return error
}

type RateDetailsV2Props = {
    showValidations?: boolean
    // updateRate: UpdateRateMutation
}
export const RateDetailsV2 = ({
    showValidations = false,
    // updateRate,
}: RateDetailsV2Props): React.ReactElement => {
    const navigate = useNavigate()
    const { id } = useParams()
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in rate edit form.'
        )
    }
    const { getKey } = useS3()

    // API handling
    const [submitRate, { loading: submitRateLoading }] = useSubmitRateMutation()
    const [fetchRate, { loading: fetchRateLoading }] = useFetchRateQuery()

    if () {
        return <GenericApiErrorBanner message="Cannot use this page to create new standalone rates"/>
    }

    let draftRate = {}
    const previousDocuments: string[] = []

    // Form validation
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const rateDetailsFormSchema = RateDetailsFormSchema()
    const rateInfosInitialValues: RateInfoArrayType = {
        rateInfos: [generateRateCertFormValues(getKey, draftRate?.draftRevision ?? undefined)],
    }

    // UI focus state management
    const [focusNewRate, setFocusNewRate] = React.useState(false)
    const newRateNameRef = React.useRef<HTMLElement | null>(null)
    const [newRateButtonRef, setNewRateButtonFocus] = useFocus() // This ref.current is always the same element
    const [focusErrorSummaryHeading, setFocusErrorSummaryHeading] = React.useState(false)
    const errorSummaryHeadingRef = React.useRef<HTMLHeadingElement>(null)

    React.useEffect(() => {
        if (focusNewRate) {
            newRateNameRef?.current?.focus()
            setFocusNewRate(false)
            newRateNameRef.current = null
        }
    }, [focusNewRate])

    useEffect(() => {
        // Focus the error summary heading only if we are displaying
        // validation errors and the heading element exists
        if (focusErrorSummaryHeading && errorSummaryHeadingRef.current) {
            errorSummaryHeadingRef.current.focus()
        }
        setFocusErrorSummaryHeading(false)
    }, [focusErrorSummaryHeading])


    const handleFormSubmit = async (
        form: RateInfoArrayType,
        setSubmitting: (isSubmitting: boolean) => void, // formik setSubmitting
        options: {
            shouldValidateDocuments: boolean
            redirectPath: string
        }
    ) => {
        const { rateInfos } = form
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
                actuaryCommunicationPreference:
                    rateInfo.actuaryCommunicationPreference,
                packagesWithSharedRateCerts:
                    rateInfo.hasSharedRateCert === 'YES'
                        ? rateInfo.packagesWithSharedRateCerts
                        : [],
            }
        })

        const initialRateRevision = cleanedRateInfos[0] // only submit the first rate revision right now from RateDetailsV2, adapt later for mulit-rate workflow

        try {
            const updatedSubmission = await submitRate({
                variables: {
                    input: {
                        rateID: initialRateRevision.id,
                        formData: initialRateRevision
                    }
                },
             })
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

        return errorObject
    }

    return (
        <Formik
            initialValues={rateInfosInitialValues}
            onSubmit={({ rateInfos }, { setSubmitting }) => {
                return handleFormSubmit({ rateInfos }, setSubmitting, {
                    shouldValidateDocuments: true,
                    redirectPath: `../contacts`,
                })
            }}
            validationSchema={rateDetailsFormSchema}
        >
            {({
                values: { rateInfos },
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
                                <legend className="srOnly">Rate Details</legend>

                                {shouldValidate && (
                                    <ErrorSummary
                                        errors={generateErrorSummaryErrors(
                                            errors
                                        )}
                                        headingRef={errorSummaryHeadingRef}
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
                                                        key={rateInfo.key}
                                                        rateInfo={rateInfo}
                                                        index={index}
                                                        shouldValidate={
                                                            shouldValidate
                                                        }
                                                        parentSubmissionID={
                                                            draftRate.id
                                                        }
                                                        previousDocuments={
                                                            previousDocuments
                                                        }
                                                        multiRatesConfig={{
                                                            removeSelf: () => {
                                                                remove(index)
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
                                                        setFocusNewRate(true)
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
                                backOnClick={async () => {
                                    const redirectPath = `../contract-details`
                                    if (dirty) {
                                        await handleFormSubmit(
                                            { rateInfos },
                                            setSubmitting,
                                            {
                                                shouldValidateDocuments: false,
                                                redirectPath,
                                            }
                                        )
                                    } else {
                                        navigate(redirectPath)
                                    }
                                }}
                                saveAsDraftOnClick={async () => {
                                    await handleFormSubmit(
                                        { rateInfos },
                                        setSubmitting,
                                        {
                                            shouldValidateDocuments: true,
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
    )
}
