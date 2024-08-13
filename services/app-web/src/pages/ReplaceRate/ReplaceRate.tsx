import {
    ButtonGroup,
    FormGroup,
    GridContainer,
    Label,
} from '@trussworks/react-uswds'
import React, { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePage } from '../../contexts/PageContext'
import {
    useFetchContractQuery,
    useWithdrawAndReplaceRedundantRateMutation,
} from '../../gen/gqlClient'
import styles from './ReplaceRate.module.scss'
import {
    ErrorOrLoadingPage,
    handleAndReturnErrorState,
} from '../../pages/StateSubmission/ErrorOrLoadingPage'
import { useAuth } from '../../contexts/AuthContext'
import { recordJSExceptionWithContext } from '../../otelHelpers'
import { Form as UswdsForm } from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import {
    ActionButton,
    DataDetail,
    FieldTextarea,
    GenericApiErrorBanner,
    PoliteErrorMessage,
} from '../../components'
import { LinkRateSelect } from '../LinkYourRates/LinkRateSelect/LinkRateSelect'
import { PageActionsContainer } from '../StateSubmission/PageActions'
import { ReplaceRateSchema } from './ReplaceRateSchema'
import { useErrorSummary } from '../../hooks/useErrorSummary'
import {
    ErrorSummaryProps,
    ErrorSummary,
} from '../../components/Form/ErrorSummary/ErrorSummary'

export interface ReplaceRateFormValues {
    replacementRateID: string
    replaceReason: string
}

type FormError =
    FormikErrors<ReplaceRateFormValues>[keyof FormikErrors<ReplaceRateFormValues>]

export const ReplaceRate = (): React.ReactElement => {
    // Page level state
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const { loggedInUser } = useAuth()
    const navigate = useNavigate()
    const { updateHeading } = usePage()
    const { setFocusErrorSummaryHeading, errorSummaryHeadingRef } =
        useErrorSummary()

    const { id, rateID } = useParams()
    if (!id || !rateID) {
        throw new Error('PROGRAMMING ERROR: proper url params not set')
    }
    // API handling
    const {
        data: initialData,
        loading: initialRequestLoading,
        error: initialRequestError,
    } = useFetchContractQuery({
        variables: {
            input: {
                contractID: id ?? 'unknown contract',
            },
        },
    })
    const [replaceRate, { loading: replaceLoading, error: replaceError }] =
        useWithdrawAndReplaceRedundantRateMutation()

    const contract = initialData?.fetchContract.contract
    const contractName =
        contract?.packageSubmissions[0]?.contractRevision.contractName
    const withdrawnRateRevisionName =
        contract?.packageSubmissions[0]?.rateRevisions.find(
            (rateRev) => rateRev.rateID == rateID
        )?.formData.rateCertificationName

    // Exclude all rates that are already attached to this contract, both linked and child rates of a multi-rate submission
    const excludeRates = contract?.packageSubmissions[0].rateRevisions.map(
        (rr) => rr.rateID
    )

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

    if (!withdrawnRateRevisionName) {
        recordJSExceptionWithContext(
            `rate ID: ${rateID} not found on contract ${id}`,
            'ReplaceRate.withdrawnRateRevisionName'
        )
        return <ErrorOrLoadingPage state="NOT_FOUND" />
    }
    // Form setup
    const formInitialValues: ReplaceRateFormValues = {
        replacementRateID: '',
        replaceReason: '',
    }
    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const onSubmit = async (values: ReplaceRateFormValues) => {
        try {
            await replaceRate({
                variables: {
                    input: {
                        replacementRateID: values.replacementRateID,
                        replaceReason: values.replaceReason,
                        withdrawnRateID: rateID,
                        contractID: id,
                    },
                },
            })
            navigate(`/submissions/${id}`)
        } catch (err) {
            recordJSExceptionWithContext(err, 'ReplaceRate.onSubmit')
        }
    }

    const generateErrorSummaryErrors = (
        errors: FormikErrors<ReplaceRateFormValues>
    ): ErrorSummaryProps['errors'] => {
        const errorObject: ErrorSummaryProps['errors'] = {}
        Object.entries(errors).forEach(([field, value]) => {
            // select dropdown component error messages needs a # proceeding the key name because this is the only way to be able to link to react-select based components. See comments in ErrorSummaryMessage component.
            if (field === 'replacementRateID') {
                errorObject[`#${field}`] = value
            } else {
                errorObject[field] = value
            }
        })

        return errorObject
    }

    return (
        <div className={styles.background}>
            <GridContainer className={styles.gridContainer}>
                {replaceError && <GenericApiErrorBanner />}
                <Formik
                    initialValues={formInitialValues}
                    onSubmit={(values) => onSubmit(values)}
                    validationSchema={ReplaceRateSchema}
                >
                    {({ errors, values, handleSubmit }) => (
                        <UswdsForm
                            className={styles.formContainer}
                            id="ReplaceRateForm"
                            aria-label={'Withdraw and replace rate on contract'}
                            aria-describedby="form-guidance"
                            onSubmit={(e) => {
                                setShouldValidate(true)
                                setFocusErrorSummaryHeading(true)
                                return handleSubmit(e)
                            }}
                        >
                            {shouldValidate && (
                                <ErrorSummary
                                    errors={generateErrorSummaryErrors(errors)}
                                    headingRef={errorSummaryHeadingRef}
                                />
                            )}

                            <h2>Replace a rate review</h2>

                            <DataDetail id="withdrawnRate" label="Current rate">
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
                                    error={errors.replaceReason}
                                    hint={
                                        <>
                                            <p
                                                id="replaceReasonHelp"
                                                role="note"
                                            >
                                                Provide a reason for revoking
                                                the rate review.
                                            </p>
                                        </>
                                    }
                                />
                                <FormGroup
                                    error={showFieldErrors(
                                        errors.replacementRateID
                                    )}
                                >
                                    <Label htmlFor={'replacementRateID'}>
                                        Select a replacement rate
                                    </Label>
                                    <span
                                        className={styles.requiredOptionalText}
                                    >
                                        Required
                                    </span>
                                    {showFieldErrors(
                                        errors.replacementRateID
                                    ) && (
                                        <PoliteErrorMessage formFieldLabel="Select a replacement rate">
                                            {errors.replacementRateID}
                                        </PoliteErrorMessage>
                                    )}
                                    <div
                                        role="note"
                                        aria-labelledby={id}
                                        className="usa-hint margin-top-1"
                                    >
                                        Selecting a rate below will withdraw the
                                        current rate from review.
                                    </div>
                                    <LinkRateSelect
                                        inputId="replacementRateID"
                                        name="replacementRateID"
                                        initialValue={values.replacementRateID}
                                        label="Which rate certification was it?"
                                        alreadySelected={excludeRates}
                                        stateCode={contract.stateCode}
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
                                        onClick={() =>
                                            navigate(`/submissions/${id}`)
                                        }
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
