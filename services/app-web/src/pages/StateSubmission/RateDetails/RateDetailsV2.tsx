import React, { useEffect } from 'react'
import { Form as UswdsForm } from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import { useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import styles from '../StateSubmissionForm.module.scss'

import { ErrorSummary, GenericApiErrorBanner, Loading } from '../../../components'
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
import { useS3 } from '../../../contexts/S3Context'
import { S3ClientT } from '../../../s3'
import { isLoadingOrHasFileErrors } from '../../../components/FileUpload'
import { RoutesRecord } from '../../../constants'
import { Rate, RateRevision, useFetchRateQuery, useSubmitRateMutation } from '../../../gen/gqlClient'
import { Error404 } from '../../Errors/Error404Page'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import { SingleRateCertV2 } from './SingleRateCert/SingleRateCertV2'



export type RateCertForm = {key: string} & RateRevision['formData']
// This function is used to get initial form values as well return empty form values when we add a new rate or delete a rate
// We need to include the getKey function in params because there are no guarantees currently file is in s3 even if when we load data from API
const generateRateCertFormValues = (
    getKey: S3ClientT['getKey'],
    rateRev?: RateRevision): RateCertForm => {
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
    }
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


    // Form validation
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const rateDetailsFormSchema = RateDetailsFormSchema({'rate-edit-unlock': true})

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


    // API handling
    const [submitRate, { loading: submitRateLoading }] = useSubmitRateMutation()
    const { data: fetchRateQuery, loading: fetchRateLoading, error: fetchRateError } = useFetchRateQuery({
        variables: {
            input: {
                rateID: id
            }
        }
    })

    if (fetchRateLoading){
        return <Loading />
    }

    if( fetchRateError) {
        return <Error404/>
    } else if (!fetchRateQuery) {
        return <GenericErrorPage/>
    }
    const rate = fetchRateQuery?.fetchRate.rate
    const previousDocuments: string[] = []

    // Formik setup
    const initialValues: RateCertForm  = generateRateCertFormValues(getKey, rate.draftRevision ?? undefined)

    const handleFormSubmit = async (
        form: RateCertForm ,
        setSubmitting: (isSubmitting: boolean) => void, // formik setSubmitting
        options: {
            shouldValidateDocuments: boolean
            redirectPath: string
        }
    ) => {
        if (options.shouldValidateDocuments) {
            const fileErrorsNeedAttention = isLoadingOrHasFileErrors(
                    initialValues.supportingDocuments.concat(initialValues.rateDocuments)
                )
            if (fileErrorsNeedAttention) {
                // make inline field errors visible so user can correct documents, direct user focus to errors, and manually exit formik submit
                setShouldValidate(true)
                setFocusErrorSummaryHeading(true)
                setSubmitting(false)
                return
            }
        }

        const cleanedrateCertForms = {
                id: form.id,
                rateType: form.rateType,
                rateCapitationType: form.rateCapitationType,
                rateDocuments: formatDocumentsForDomain(form.rateDocuments),
                supportingDocuments: formatDocumentsForDomain(
                    form.supportingDocuments
                ),
                rateDateStart: formatFormDateForDomain(form.rateDateStart),
                rateDateEnd: formatFormDateForDomain(form.rateDateEnd),
                rateDateCertified: formatFormDateForDomain(
                    form.rateDateCertified
                ),
                rateAmendmentInfo:
                    form.rateType === 'AMENDMENT'
                        ? {
                              effectiveDateStart: formatFormDateForDomain(
                                  form.effectiveDateStart
                              ),
                              effectiveDateEnd: formatFormDateForDomain(
                                  form.effectiveDateEnd
                              ),
                          }
                        : undefined,
                rateProgramIDs: form.rateProgramIDs,
                actuaryContacts: form.actuaryContacts,
                actuaryCommunicationPreference:
                    form.actuaryCommunicationPreference,
        }

        try {
            const updatedSubmission = await submitRate({
                variables: {
                    input: {
                        rateID: rate.id,
                        // formData: initialRateRevision
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
        errors: FormikErrors<RateCertForm >
    ) => {
        const rateErrors = errors
        const errorObject: { [field: string]: string } = {}

        if (rateErrors && Array.isArray(rateErrors)) {
            rateErrors.forEach((rateError, index) => {
                if (!rateError) return

                Object.entries(rateError).forEach(([field, value]) => {
                    if (typeof value === 'string') {

                        //rateProgramIDs error message needs a # proceeding the key name because this is the only way to be able to link to the Select component element see comments in ErrorSummaryMessage component.
                        const errorKey =
                            field === 'rateProgramIDs'  ? `#rateCertForms.${index}.${field}`
                                : `rateCertForms.${index}.${field}`
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
                                    const errorKey = `rateCertForms.${index}.actuaryContacts.0.${contactField}`
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
            initialValues={initialValues}
            onSubmit={({ rateCertForm }, { setSubmitting }) => {
                return handleFormSubmit({ rateCertForm }, setSubmitting, {
                    shouldValidateDocuments: true,
                    redirectPath: `../contacts`,
                })
            }}
            validationSchema={rateDetailsFormSchema}
        >
            {({
                values: { rateCertForm },
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
                                <legend className="srOnly">Rate Details</legend>

                                {shouldValidate && (
                                    <ErrorSummary
                                        errors={generateErrorSummaryErrors(
                                            errors
                                        )}
                                        headingRef={errorSummaryHeadingRef}
                                    />
                                )}
                                    <SingleRateCertV2
                                        key={rateInfo.key}
                                        rate={rateInfo}
                                        index={index}
                                        shouldValidate={
                                            shouldValidate
                                        }
                                        previousDocuments={
                                            previousDocuments
                                        }

                                    />
                            </fieldset>
                            <PageActions
                                backOnClick={async () => {
                                    const redirectPath = `../contract-details`
                                    if (dirty) {
                                        await handleFormSubmit(
                                            { rateCertForms },
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
                                        { rateCertForms },
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
