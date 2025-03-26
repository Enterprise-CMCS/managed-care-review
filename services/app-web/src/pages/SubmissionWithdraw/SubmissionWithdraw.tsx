import React from 'react'
import styles from './SubmissionWithdraw.module.scss'
import { ActionButton, Breadcrumbs, PoliteErrorMessage } from '../../components'
import { RoutesRecord } from '@mc-review/constants'
import { useNavigate, useParams } from 'react-router-dom'
import {
    RateStripped,
    useFetchContractQuery,
    useIndexRatesStrippedWithRelatedContractsQuery,
} from '../../gen/gqlClient'
import { Formik, FormikErrors } from 'formik'
import {
    ButtonGroup,
    Form,
    FormGroup,
    Label,
    Textarea,
} from '@trussworks/react-uswds'
import { PageActionsContainer } from '../StateSubmission/PageActions'
import * as Yup from 'yup'
import { ErrorOrLoadingPage } from '../StateSubmission'
import { handleAndReturnErrorState } from '../StateSubmission/ErrorOrLoadingPage'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { WithdrawSubmissionBanner } from '../../components/Banner/WithdrawSubmissionBanner/WithdrawSubmissionBanner'

type SubmissionWithdrawValues = {
    submissionWithdrawReason: string
}

export type RatesToNotBeWithdrawn = {
    rateName: string
    rateURL: string
}

type RelatedContract = {
    consolidatedStatus: string
    id: string
}

type FormError =
    FormikErrors<SubmissionWithdrawValues>[keyof FormikErrors<SubmissionWithdrawValues>]

const submissionWithdrawSchema = Yup.object().shape({
    submissionWithdrawReason: Yup.string().required(
        'You must provide a reason for withdrawing this submission.'
    ),
})

export const SubmissionWithdraw = (): React.ReactElement => {
    const { id } = useParams() as { id: string }
    const navigate = useNavigate()
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const showFieldErrors = (error?: FormError): boolean | undefined =>
        shouldValidate && Boolean(error)
    const formInitialValues: SubmissionWithdrawValues = {
        submissionWithdrawReason: '',
    }

    //Fetching contract to be withdrawn
    const {
        data: contractData,
        loading: contractLoading,
        error: contractError,
    } = useFetchContractQuery({
        variables: {
            input: {
                contractID: id,
            },
        },
        fetchPolicy: 'cache-and-network',
    })
    const contract = contractData?.fetchContract.contract
    //Extracting rateIDs to query for parent contract data
    const rateIDs = contract
        ? contract.packageSubmissions[0].rateRevisions.map((rr) => rr.rate!.id)
        : []

    //Fetching rates associated with above contract to determine whether or not they will be withdrawn (banner display)
    //This query will be skipped if rateIDs comes up empty
    const {
        data: ratesData,
        loading: ratesLoading,
        error: ratesError,
    } = useIndexRatesStrippedWithRelatedContractsQuery({
        variables: {
            input: {
                stateCode: undefined,
                rateIDs: rateIDs,
            },
        },
        skip: rateIDs.length === 0,
        fetchPolicy: 'cache-and-network',
    })

    if (contractLoading || ratesLoading) {
        return <ErrorOrLoadingPage state="LOADING" />
    } else if (contractError || ratesError) {
        const queryError = contractError ?? ratesError
        return (
            <ErrorOrLoadingPage
                state={handleAndReturnErrorState(queryError!)}
            />
        )
    } else if (!contract || !contract.packageSubmissions) {
        return <GenericErrorPage />
    } else if (
        rateIDs.length !== 0 &&
        (!ratesData || !ratesData.indexRatesStripped.edges)
    ) {
        return <GenericErrorPage />
    }

    const shouldWithdraw = (rate: RateStripped) => {
        const parentContractID = rate.parentContractID
        const rateStatus = rate.consolidatedStatus
        const relatedContracts = rate.relatedContracts
        const parentContract = relatedContracts!.find(
            (contract: RelatedContract) => contract.id === parentContractID
        )

        //If not in a submitted status it should not be withdrawn
        if (!['RESUBMITTED', 'SUBMITTED'].includes(rateStatus)) {
            return false
        }

        //If the parent contract is not in a withdrawn state then the LINKED rate is not withdrawn
        if (
            parentContractID !== id &&
            parentContract?.consolidatedStatus !== 'WITHDRAWN'
        ) {
            return false
        }

        //If ANY of the linked submissions are in a submitted or approved state excluding the parent it will not be withdrawn
        for (const contract of relatedContracts!) {
            if (
                contract.id !== id &&
                ['APPROVED', 'SUBMITTED', 'RESUBMITTED'].includes(
                    contract.consolidatedStatus
                )
            ) {
                return false
            }
        }

        return true
    }

    const contractName =
        contract.packageSubmissions[0].contractRevision.contractName

    //These rates will be displayed in the warning banner
    const ratesToNotBeWithdrawn: RatesToNotBeWithdrawn[] = []
    if (ratesData && ratesData.indexRatesStripped.edges.length > 0) {
        const ratesWithContractData = ratesData.indexRatesStripped.edges
        ratesWithContractData.forEach((rate) => {
            if (!shouldWithdraw(rate.node as RateStripped)) {
                ratesToNotBeWithdrawn.push({
                    rateName:
                        rate.node.latestSubmittedRevision.formData
                            .rateCertificationName!,
                    rateURL: `/rates/${rate.node.id}`,
                })
            }
        })
    }

    return (
        <div className={styles.submissionWithdrawContainer}>
            <Breadcrumbs
                className="use-breadcrumb--wrap"
                items={[
                    {
                        link: RoutesRecord.DASHBOARD_SUBMISSIONS,
                        text: 'Dashboard',
                    },
                    {
                        link: `/submissions/${id}`,
                        text: contractName || '',
                    },
                    {
                        text: 'Withdraw submission',
                        link: RoutesRecord.SUBMISSION_WITHDRAW,
                    },
                ]}
            />
            {ratesToNotBeWithdrawn.length > 0 && (
                <WithdrawSubmissionBanner rates={ratesToNotBeWithdrawn} />
            )}
            <Formik
                initialValues={formInitialValues}
                onSubmit={() => window.alert('Not implemented')}
                validationSchema={submissionWithdrawSchema}
            >
                {({ handleSubmit, handleChange, errors, values }) => (
                    <Form
                        id="SubmissionWithdrawForm"
                        className={styles.formContainer}
                        aria-label="Withdraw submission"
                        aria-describedby="form-guidance"
                        onSubmit={(e) => {
                            setShouldValidate(true)
                            return handleSubmit(e)
                        }}
                    >
                        <fieldset className="usa-fieldset">
                            <h2>Withdraw submission</h2>
                            <FormGroup
                                error={showFieldErrors(
                                    errors.submissionWithdrawReason
                                )}
                                className="margin-top-0"
                            >
                                <Label
                                    htmlFor="submissionWithdrawReason"
                                    className="margin-bottom-0 text-bold"
                                >
                                    Reason for withdrawing the submission.
                                </Label>
                                <p className="margin-bottom-0 margin-top-05 usa-hint">
                                    Required
                                </p>
                                {showFieldErrors(
                                    errors.submissionWithdrawReason
                                ) && (
                                    <PoliteErrorMessage formFieldLabel="">
                                        {errors.submissionWithdrawReason}
                                    </PoliteErrorMessage>
                                )}
                                <Textarea
                                    name="submissionWithdrawReason"
                                    id="submissionWithdrawReason"
                                    data-testid="submissionWithdrawReason"
                                    aria-labelledby="submissionWithdrawReason"
                                    aria-required
                                    defaultValue={
                                        values.submissionWithdrawReason
                                    }
                                    onChange={handleChange}
                                    error={showFieldErrors(
                                        errors.submissionWithdrawReason
                                    )}
                                />
                            </FormGroup>
                        </fieldset>
                        <PageActionsContainer>
                            <ButtonGroup type="default">
                                <ActionButton
                                    type="button"
                                    variant="outline"
                                    data-testid="page-actions-left-secondary"
                                    parent_component_type="page-body"
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
                                    disabled={showFieldErrors(
                                        errors.submissionWithdrawReason
                                    )}
                                >
                                    Withdraw submission
                                </ActionButton>
                            </ButtonGroup>
                        </PageActionsContainer>
                    </Form>
                )}
            </Formik>
        </div>
    )
}
