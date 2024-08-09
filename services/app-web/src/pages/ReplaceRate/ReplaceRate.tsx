import { ButtonGroup, FormGroup, GridContainer, Label } from '@trussworks/react-uswds'
import * as Yup from 'yup'
import React, { useEffect, } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePage } from '../../contexts/PageContext'
import { useFetchContractQuery, useWithdrawAndReplaceRedundantRateMutation } from '../../gen/gqlClient'
import styles from './ReplaceRate.module.scss'
import { ErrorOrLoadingPage, handleAndReturnErrorState } from '../../pages/StateSubmission/ErrorOrLoadingPage'
import { useAuth } from '../../contexts/AuthContext'
import { recordJSExceptionWithContext } from '../../otelHelpers'
import {
    Form as UswdsForm,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import { ActionButton, DataDetail, FieldTextarea, GenericApiErrorBanner, PoliteErrorMessage } from '../../components'
import { LinkRateSelect } from '../LinkYourRates/LinkRateSelect'
import { PageActionsContainer } from '../StateSubmission/PageActions'

export interface ReplaceRateFormValues {
    replacementRateID: string
   replaceReason: string
}
type FormError =
    FormikErrors<ReplaceRateFormValues>[keyof FormikErrors<ReplaceRateFormValues>]

export const ReplaceRate = (): React.ReactElement => {
    // Page level state
    const [shouldValidate] = React.useState(false)
    const { loggedInUser } = useAuth()
    const navigate = useNavigate()
    const { updateHeading } = usePage()
    const { id, rateID} = useParams()
    if (!id ||!rateID) {
        throw new Error('PROGRAMMING ERROR: proper url params not set')
    }
    // API handling
    const {  data: initialData, loading: initialRequestLoading, error: initialRequestError } = useFetchContractQuery({
        variables: {
            input: {
                contractID: id ?? 'unknown contract',
            },
        },
    })
    const [replaceRate, {loading: replaceLoading, error: replaceError}] = useWithdrawAndReplaceRedundantRateMutation()

    const contract =  initialData?.fetchContract.contract
    const contractName = contract?.packageSubmissions[0]?.contractRevision.contractName
    const withdrawnRateRevisionName =  contract?.packageSubmissions[0]?.rateRevisions.find( rateRev => rateRev.rateID == rateID)?.formData.rateCertificationName

    useEffect(() => {
        updateHeading({ customHeading: contractName })
    }, [contractName, updateHeading])


    if (loggedInUser?.role != 'ADMIN_USER') {
        return <ErrorOrLoadingPage state="FORBIDDEN" />
    }

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

    if(!withdrawnRateRevisionName){
        recordJSExceptionWithContext(`rate ID: ${rateID} not found on contract ${id}`, 'ReplaceRate.withdrawnRateRevisionName')
        return <ErrorOrLoadingPage state='NOT_FOUND'/>
    }
    // Form setup
    const formInitialValues: ReplaceRateFormValues = {
        replacementRateID:'',
        replaceReason: 'Admin has decided to replace this rate'

    }
    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const onSubmit = async (values : ReplaceRateFormValues) => {
       try {
         await replaceRate({ variables: {
                input: {
                replacementRateID: values.replacementRateID,
                replaceReason: values.replaceReason,
                withdrawnRateID: rateID,
                contractID: id,
            }
         }
         })
         navigate(
            `/submissions/${id}`
        )
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
                className={styles.gridContainer}
            >
                  {replaceError && <GenericApiErrorBanner />}
                  <Formik
                    initialValues={formInitialValues}
                    onSubmit={(values) => onSubmit(values)}
                    validationSchema={() =>
                        Yup.object().shape({
                            replaceReason: Yup.string(),
                            replacementRateID: Yup.string(),
                        })
                        }
                >
                    {({
                        errors,
                        values,
                        handleSubmit,
                    }) => (
                            <UswdsForm
                                className={styles.formContainer}
                                id="ReplaceRateForm"
                                aria-label={'Withdraw and replace rate on contract'}
                                aria-describedby="form-guidance"
                                onSubmit={(e) => {

                                    return handleSubmit(e)}}
                            >
                <h2>Replace a rate review</h2>
                <DataDetail
                 id="withdrawnRate"
                 label="Current rate"
                 >
                {withdrawnRateRevisionName}
                </DataDetail>

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
                                    <Label htmlFor={'replacementRateID'}>
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
                                        inputId="replacementRateID"
                                        name="replacementRateID"
                                        initialValue={values.replacementRateID}
                                        label="Which rate certification was it?"
                                        alreadySelected={[rateID]}
                                    />

                                    </FormGroup>

                                </fieldset>
                        <PageActionsContainer>
                    <ButtonGroup type="default">
                        <ActionButton
                            type="button"
                            variant="outline"
                            data-testid="page-actions-left-secondary"
                            parent_component_type="page body"
                            link_url={`/submissions/${id}`}
                            onClick={()=> navigate(`/submissions/${id}`)}
                        >
                            Cancel
                        </ActionButton>

                        <ActionButton
                            type="submit"
                            variant="default"
                            data-testid="page-actions-right-primary"
                            parent_component_type="page body"
                            link_url={`/submissions/${id}`}
                            animationTimeout={1000}
                            loading={replaceLoading}
                        >
                           Replace rate
                        </ActionButton>
                    </ButtonGroup>
                </PageActionsContainer>
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
