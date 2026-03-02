import React, { useEffect, useLayoutEffect } from 'react'
import styles from './SubmissionWithdraw.module.scss'
import {
    ActionButton,
    Breadcrumbs,
    FieldTextarea,
    GenericApiErrorBanner,
    PageActionsContainer,
} from '../../components'
import {
    ContractSubmissionTypeRecord,
    RoutesRecord,
} from '@mc-review/constants'
import { generatePath, useNavigate } from 'react-router-dom'
import {
    RateStripped,
    useFetchContractQuery,
    useIndexRatesStrippedWithRelatedContractsQuery,
    useWithdrawContractMutation,
} from '../../gen/gqlClient'
import { Formik, FormikErrors } from 'formik'
import { ButtonGroup, Form } from '@trussworks/react-uswds'
import * as Yup from 'yup'
import { ErrorOrLoadingPage } from '../StateSubmission'
import { handleAndReturnErrorState } from '../StateSubmission/SharedSubmissionComponents'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { SubmissionWithdrawWarningBanner } from '../../components/Banner/SubmissionWithdrawWarningBanner/SubmissionWithdrawWarningBanner'
import { useMemoizedStateHeader, useRouteParams, useTealium } from '../../hooks'
import { recordJSException } from '@mc-review/otel'
import { usePage } from '../../contexts/PageContext'
import { Error404 } from '../Errors/Error404Page'

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

export const shouldWarnOnWithdraw = (
    rate: RateStripped,
    submissionToBeWithdrawnID: string
) => {
    const parentContractID = rate.parentContractID
    const rateStatus = rate.consolidatedStatus
    const relatedContracts = rate.relatedContracts
    const parentContract = relatedContracts?.find(
        (contract: RelatedContract) => contract.id === parentContractID
    )

    //If the rate is not in a submitted status it will not be withdrawn
    if (!['RESUBMITTED', 'SUBMITTED'].includes(rateStatus)) {
        return false
    }

    //If the parent contract for a LINKED rate is NOT in a withdrawn state then the LINKED rate is not withdrawn
    if (
        parentContractID !== submissionToBeWithdrawnID &&
        parentContract?.consolidatedStatus !== 'WITHDRAWN'
    ) {
        return false
    }

    //If ANY of the RELATED contracts are in a submitted or approved state excluding the parent - the rate will not be withdrawn
    for (const contract of relatedContracts!) {
        if (
            contract.id !== submissionToBeWithdrawnID &&
            ['APPROVED', 'SUBMITTED', 'RESUBMITTED'].includes(
                contract.consolidatedStatus
            )
        ) {
            return false
        }
    }

    return true
}

export const SubmissionWithdraw = (): React.ReactElement => {
    const { id, contractSubmissionType } = useRouteParams()
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in submission withdraw form.'
        )
    }
    const { updateHeading, updateActiveMainContent } = usePage()    
    const { logFormSubmitEvent } = useTealium()
    const navigate = useNavigate()
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const [
        withdrawContract,
        { error: withdrawError, loading: withdrawLoading },
    ] = useWithdrawContractMutation()
    const showFieldErrors = (error?: FormError): boolean =>
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
        ? contract.packageSubmissions[0].rateRevisions.map((rr) => rr.rateID)
        : []
    const contractName =
        contract?.packageSubmissions[0].contractRevision.contractName
    const stateHeader = useMemoizedStateHeader({
        subHeaderText: contractName,
        stateCode: contract?.state.code,
        stateName: contract?.state.name,
        contractType: contract?.contractSubmissionType,
    })

    useLayoutEffect(() => {
        updateHeading({ customHeading: stateHeader })
    }, [stateHeader, updateHeading])

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent('SubmissionWithdrawForm')
    }, [updateActiveMainContent])

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

    if (
        ContractSubmissionTypeRecord[contract.contractSubmissionType] !==
        contractSubmissionType
    ) {
        return <Error404 />
    }

    //These rates will be displayed in the warning banner
    const ratesToNotBeWithdrawn: RatesToNotBeWithdrawn[] = []
    if (ratesData && ratesData.indexRatesStripped.edges.length > 0) {
        const ratesWithContractData = ratesData.indexRatesStripped.edges
        ratesWithContractData.forEach((rate) => {
            if (!shouldWarnOnWithdraw(rate.node as RateStripped, id)) {
                ratesToNotBeWithdrawn.push({
                    rateName:
                        rate.node.latestSubmittedRevision.formData
                            .rateCertificationName!,
                    rateURL: `/rates/${rate.node.id}`,
                })
            }
        })
    }

    const withdrawSubmissionPackage = async (
        values: SubmissionWithdrawValues
    ) => {
        logFormSubmitEvent({
            heading: 'Withdraw submission',
            form_name: 'Withdraw submission',
            event_name: 'form_field_submit',
            link_type: 'link_other',
        })
        try {
            await withdrawContract({
                variables: {
                    input: {
                        contractID: id,
                        updatedReason: values.submissionWithdrawReason,
                    },
                },
            })
            navigate(`/submissions/${contractSubmissionType}/${id}`)
        } catch (err) {
            recordJSException(
                `WithdrawContract: GraphQL error reported. Error message: Failed to create form data ${err}`
            )
        }
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
                        link: `/submissions/${contractSubmissionType}/${id}`,
                        text: contractName || '',
                    },
                    {
                        link: generatePath(RoutesRecord.SUBMISSION_WITHDRAW, {
                            id,
                            contractSubmissionType,
                        }),
                        text: 'Withdraw submission',
                    },
                ]}
            />
            {ratesToNotBeWithdrawn.length > 0 && (
                <SubmissionWithdrawWarningBanner
                    rates={ratesToNotBeWithdrawn}
                />
            )}
            <Formik
                initialValues={formInitialValues}
                onSubmit={(values) => withdrawSubmissionPackage(values)}
                validationSchema={submissionWithdrawSchema}
            >
                {({ handleSubmit, handleChange, errors, values }) => (
                    <Form
                        id="SubmissionWithdrawForm"
                        className={styles.formContainer}
                        onSubmit={(e) => {
                            setShouldValidate(true)
                            return handleSubmit(e)
                        }}
                    >
                        {withdrawError && <GenericApiErrorBanner />}
                        <fieldset className="usa-fieldset">
                            <h2>Withdraw submission</h2>
                            <FieldTextarea
                                label="Reason for withdrawing the submission."
                                name="submissionWithdrawReason"
                                id="submissionWithdrawReason"
                                data-testid="submissionWithdrawReason"
                                onChange={handleChange}
                                aria-required
                                hint="Provide a reason for withdrawing the submission review."
                                showError={showFieldErrors(
                                    errors.submissionWithdrawReason
                                )}
                            />
                        </fieldset>
                        <PageActionsContainer>
                            <ButtonGroup type="default">
                                <ActionButton
                                    type="button"
                                    variant="outline"
                                    data-testid="page-actions-left-secondary"
                                    parent_component_type="page-body"
                                    link_url={`/submissions/${contractSubmissionType}/${id}`}
                                    onClick={() =>
                                        navigate(
                                            `/submissions/${contractSubmissionType}/${id}`
                                        )
                                    }
                                >
                                    Cancel
                                </ActionButton>
                                <ActionButton
                                    type="submit"
                                    variant="default"
                                    data-testid="page-actions-right-primary"
                                    parent_component_type="page body"
                                    link_url={`/submissions/${contractSubmissionType}/${id}`}
                                    animationTimeout={1000}
                                    disabled={showFieldErrors(
                                        errors.submissionWithdrawReason
                                    )}
                                    loading={withdrawLoading}
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
