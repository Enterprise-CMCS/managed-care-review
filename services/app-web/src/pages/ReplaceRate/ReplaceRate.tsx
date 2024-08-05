import { FormGroup, GridContainer, Label } from '@trussworks/react-uswds'
import * as Yup from 'yup'
import React, { useEffect, } from 'react'
import { useParams } from 'react-router-dom'
import { usePage } from '../../contexts/PageContext'
import { useFetchContractQuery, useWithdrawAndReplaceRedundantRateMutation } from '../../gen/gqlClient'
import styles from './ReplaceRate.module.scss'
import { ErrorOrLoadingPage, handleAndReturnErrorState } from '../../pages/StateSubmission/ErrorOrLoadingPage'
import { useAuth } from '../../contexts/AuthContext'
import { recordJSExceptionWithContext } from '../../otelHelpers'
import {
    Form as UswdsForm,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors, getIn } from 'formik'
import { DataDetail, FieldTextarea, PoliteErrorMessage } from '../../components'
import { LinkRateSelect } from '../LinkYourRates/LinkRateSelect'

export interface ReplaceRateFormValues {
    replacementRateID: string | undefined
   replaceReason: string | undefined
}
type FormError =
    FormikErrors<ReplaceRateFormValues>[keyof FormikErrors<ReplaceRateFormValues>]

export const ReplaceRate = (): React.ReactElement => {
    // Page level state
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const { loggedInUser } = useAuth()
    const { updateHeading } = usePage()
    const { id, rateID} = useParams()
    if (!id ||!rateID) {
        throw new Error('PROGRAMMING ERROR: proper url params not set')
    }
    if (loggedInUser?.role != 'ADMIN_USER') {
        return <ErrorOrLoadingPage state="FORBIDDEN" />
    }

    // API handling
    const {  data: initialData, loading: initialRequestLoading, error: initialRequestError } = useFetchContractQuery({
        variables: {
            input: {
                contractID: id ?? 'unknown contract',
            },
        },
    })

    const [replaceRate, {data: replaceData, loading: replaceLoading, error: replaceError}] = useWithdrawAndReplaceRedundantRateMutation()

    const contract =  initialData?.fetchContract.contract
    const contractName = contract?.packageSubmissions[0].contractRevision.contractName
    const withdrawnRateRevisionName =  contract?.packageSubmissions[0].rateRevisions.find( rateRev => rateRev.rateID == rateID)?.formData.rateCertificationName

    useEffect(() => {
        updateHeading({ customHeading: contractName })
    }, [contractName, updateHeading])

    if (initialRequestLoading) {
        return <ErrorOrLoadingPage state="LOADING" />
    }
    if(!withdrawnRateRevisionName){
        recordJSExceptionWithContext(`rate ID: ${rateID} not found on contract`, 'ReplaceRate.withdrawnRateRevisionName')
        return <ErrorOrLoadingPage state='NOT_FOUND'/>
    }
    if (initialRequestError) {
        return (
            <ErrorOrLoadingPage
                state={handleAndReturnErrorState(initialRequestError)}
            />
        )
    }

    // Form setup
    const formInitialValues: ReplaceRateFormValues = {
        replacementRateID: undefined,
        replaceReason: 'Admin has decided to replace this rate'

    }
    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const onSubmit = async ({replacementRateID, replaceReason } : {replacementRateID: string, replaceReason: string}) => {
       try {
         await replaceRate({ variables: {
                input: {
                replacementRateID,
                replaceReason,
                withdrawnRateID: rateID,
                contractID: id,
            }
         }
         })
    } catch (err) {
        recordJSExceptionWithContext(
            err,
            'ReplaceRate.onSubmit'
        )
    }
    }

    return (
        <div className={styles.background}>
            <GridContainer
                data-testid="rate-summary"
                className={styles.gridContainer}
            >
                <h2>Replace a rate review</h2>
                <DataDetail
                 id="withdrawnRate"
                 label="Current rate"
                 >
                {withdrawnRateRevisionName}
                </DataDetail>
                <Formik
                    initialValues={formInitialValues}
                    onSubmit={onSubmit}
                    validationSchema={() =>
                        Yup.object().shape({
                            replaceReason: Yup.string().required(),

                            replacementRateID: Yup.string().required(),
                        })
                        }
                >
                    {({
                        values,
                        errors,
                        handleSubmit,
                        setSubmitting,
                        isSubmitting,
                        setFieldValue,
                    }) => (

                            <UswdsForm
                                className={styles.formContainer}
                                id="ReplaceRateForm"
                                aria-label={'Withdraw and replace rate on contract'}
                                aria-describedby="form-guidance"
                                onSubmit={() => onSubmit}
                            >
                                <fieldset className="usa-fieldset">
                                    <legend className="srOnly">
                                        Withdraw and replace rate on contract
                                    </legend>
                                    <FieldTextarea
                                        label="Reason for revoking"
                                        id="replaceReason"
                                        name="replaceReason"
                                        aria-required
                                        aria-describedby="replaceReasonHelp"
                                        showError={showFieldErrors(
                                            errors.replaceReason
                                        )}
                                        hint={
                                            <>
                                                <p
                                                    id="replaceReasonHelp"
                                                    role="note"
                                                >
                                                    Provide a reason for revoking the rate review.
                                                </p>
                                            </>
                                        }
                                    />
                                    <FormGroup>
                                    <Label htmlFor={`replacementRateID`}>
                                    Select a replacement rate
                                    </Label>
                                    <span className={styles.requiredOptionalText}>
                                        Required
                                    </span>
                                    <PoliteErrorMessage formFieldLabel="Select a replacement rate">
                                        {showFieldErrors('replacementRateID')}
                                    </PoliteErrorMessage>
                                <div
                                    role="note"
                                    aria-labelledby={id}
                                    className="usa-hint margin-top-1"
                                >
                                   Selecting a rate below will withdraw the current rate from review.
                                </div>
                                    <LinkRateSelect
                                        inputId={`replacementRateID`}
                                        name={`replacementRateID`}
                                        initialValue={getIn(values, `replacementRateID`)}
                                        label="Which rate certification was it?"
                                    />

                                    </FormGroup>

                                </fieldset>
                                </UswdsForm>
                                )}
                         </Formik>
            </GridContainer>
        </div>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}
