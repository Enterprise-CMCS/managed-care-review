import React, { useEffect } from 'react'
import { Form as UswdsForm } from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import { useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import styles from '../../StateSubmissionForm.module.scss'

import { ErrorSummary } from '../../../../components'
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
import { RouteT, RoutesRecord } from '../../../../constants'
import {
    Rate,
    RateFormDataInput,
    RateRevision,
} from '../../../../gen/gqlClient'
import { SingleRateCertV2 } from './SingleRateCertV2'
import type { SubmitOrUpdateRate } from '../../../RateEdit/RateEdit'

export type RateDetailFormValues = {
    id: Rate['id']
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
    const newRateID = uuidv4()

    return {
        id: rateID ?? newRateID,
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
    showValidations?: boolean
    rates: Rate[]
    submitRate: SubmitOrUpdateRate
    // updateRate: SubmitOrUpdateRate  - will be implemented in Link Rates Epic
}
export const RateDetailsV2 = ({
    showValidations = false,
    rates,
    submitRate,
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
    const rateDetailsFormSchema = RateDetailsFormSchema({
        'rate-edit-unlock': true,
    })

    // UI focus state management
    const [focusErrorSummaryHeading, setFocusErrorSummaryHeading] =
        React.useState(false)
    const errorSummaryHeadingRef = React.useRef<HTMLHeadingElement>(null)

    useEffect(() => {
        // Focus the error summary heading only if we are displaying
        // validation errors and the heading element exists
        if (focusErrorSummaryHeading && errorSummaryHeadingRef.current) {
            errorSummaryHeadingRef.current.focus()
        }
        setFocusErrorSummaryHeading(false)
    }, [focusErrorSummaryHeading])

    const previousDocuments: string[] = []

    // Formik setup
    const initialValues: RateDetailFormConfig = {
        rates:
            rates.length > 0
                ? rates.map((rate) =>
                      generateFormValues(
                          getKey,
                          rate.draftRevision ?? undefined,
                          rate.id
                      )
                  )
                : [
                      generateFormValues(
                          getKey,
                          rates[0].draftRevision ?? undefined,
                          rates[0].id
                      ),
                  ],
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

        const gqlFormDatas: Array<{ id: string } & RateFormDataInput> =
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

        if (options.type === 'CONTINUE') {
            await submitRate(id, formData, setSubmitting, 'DASHBOARD')
        } else if (options.type === 'SAVE_AS_DRAFT') {
            throw new Error(
                'Rate update is not yet implemented so save as draft is not possible. This will be part of Link Rates epic.'
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
        <Formik
            initialValues={initialValues}
            onSubmit={(rateFormValues, { setSubmitting }) => {
                return handlePageAction(rateFormValues.rates, setSubmitting, {
                    type: 'CONTINUE',
                    redirectPath: 'DASHBOARD_SUBMISSIONS',
                })
            }}
            validationSchema={rateDetailsFormSchema}
        >
            {({
                values: rateFormValues,
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
                                    key={rateFormValues.rates[0].id}
                                    rateForm={rateFormValues.rates[0]}
                                    index={0} // this hard coding will be changed when we implement multi-rates with LinkedRates
                                    shouldValidate={shouldValidate}
                                    previousDocuments={previousDocuments}
                                />
                            </fieldset>
                            <PageActions
                                backOnClick={async () => {
                                    if (dirty) {
                                        await handlePageAction(
                                            rateFormValues.rates,
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
                                saveAsDraftOnClick={async () => {
                                    await handlePageAction(
                                        rateFormValues.rates,
                                        setSubmitting,
                                        {
                                            type: 'SAVE_AS_DRAFT',
                                            redirectPath:
                                                'DASHBOARD_SUBMISSIONS',
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
