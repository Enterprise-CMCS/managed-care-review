import React, { useState, useLayoutEffect, useEffect } from 'react'
import {
    Form as UswdsForm,
    ButtonGroup,
    GridContainer,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import { MccrsIdFormSchema } from './MccrsIdSchema'
import { recordJSException } from '@mc-review/otel'
import { useNavigate } from 'react-router-dom'
import { usePage } from '../../contexts/PageContext'
import {
    Loading,
    GenericApiErrorBanner,
    ActionButton,
    FieldTextInput,
    Breadcrumbs,
} from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import {
    ContractSubmissionTypeRecord,
    RoutesRecord,
} from '@mc-review/constants'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { Error404 } from '../Errors/Error404Page'
import { ErrorForbiddenPage } from '../Errors/ErrorForbiddenPage'
import {
    useUpdateContractMutation,
    useFetchContractQuery,
    Contract,
} from '../../gen/gqlClient'
import styles from './MccrsId.module.scss'
import { useMemoizedStateHeader, useRouteParams } from '../../hooks'

export interface MccrsIdFormValues {
    mccrsId: number | undefined
}
type FormError =
    FormikErrors<MccrsIdFormValues>[keyof FormikErrors<MccrsIdFormValues>]

export const MccrsId = (): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(true)
    const { id, contractSubmissionType } = useRouteParams()
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in state submission form.'
        )
    }

    const { loggedInUser } = useAuth()
    const navigate = useNavigate()

    // page context
    const { updateHeading, updateActiveMainContent } = usePage()

    const [showPageErrorMessage, setShowPageErrorMessage] = useState<
        boolean | string
    >(false) // string is a custom error message, defaults to generic of true
    const [updateContract] = useUpdateContractMutation()
    const {
        data: fetchContractData,
        loading: fetchContractLoading,
        error: fetchContractError,
    } = useFetchContractQuery({
        variables: {
            input: {
                contractID: id,
            },
        },
        fetchPolicy: 'cache-and-network',
    })

    const contract = fetchContractData?.fetchContract.contract
    const contractName =
        contract && contract?.packageSubmissions.length > 0
            ? contract.packageSubmissions[0].contractRevision.contractName
            : ''
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
         updateActiveMainContent('MCCRSIDForm')
     }, [updateActiveMainContent])   

    // Handle loading and error states for fetching data while using cached data
    if (!fetchContractData && fetchContractLoading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (fetchContractError && !fetchContractData) {
        //error handling for a state user that tries to access contracts for a different state
        if (
            fetchContractError?.graphQLErrors[0]?.extensions?.code ===
            'FORBIDDEN'
        ) {
            return (
                <ErrorForbiddenPage
                    errorMsg={fetchContractError.graphQLErrors[0].message}
                />
            )
        } else if (
            fetchContractError?.graphQLErrors[0]?.extensions?.code ===
            'NOT_FOUND'
        ) {
            return <Error404 />
        } else {
            return <GenericErrorPage />
        }
    } else if (!contract || !loggedInUser) {
        return <GenericErrorPage />
    }

    if (
        ContractSubmissionTypeRecord[contract.contractSubmissionType] !==
        contractSubmissionType
    ) {
        return <Error404 />
    }

    const submitInfo = contract.packageSubmissions[0].submitInfo
    if (!submitInfo) {
        const errMsg = `No currently submitted revision for this package: ${contract.id}, programming error. `
        recordJSException(errMsg)
        return <GenericErrorPage />
    }

    const mccrsIDInitialValues: MccrsIdFormValues = {
        mccrsId: contract.mccrsID ? Number(contract.mccrsID) : undefined,
    }

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const handleFormSubmit = async (
        values: MccrsIdFormValues,
        contractSubmissionType: string
    ) => {
        setShowPageErrorMessage(false)
        try {
            const updateResult = await updateContract({
                variables: {
                    input: {
                        mccrsID:
                            values?.mccrsId?.toString().replace(/ /g, '') ||
                            undefined,
                        id: id,
                    },
                },
            })

            const updatedSubmission: Contract | undefined =
                updateResult?.data?.updateContract.contract

            if (!updatedSubmission) {
                setShowPageErrorMessage(true)

                console.info('Failed to update form data', updateResult)
                recordJSException(
                    `MCCRSIDForm: Apollo error reported. Error message: Failed to update form data ${updateResult}`
                )
                return new Error('Failed to update form data')
            }
            navigate(
                `/submissions/${contractSubmissionType}/${updatedSubmission.id}`
            )
        } catch (serverError) {
            setShowPageErrorMessage(true)
            recordJSException(
                `MCCRSIDForm: Apollo error reported. Error message: ${serverError.message}`
            )
            return new Error(serverError)
        }
    }

    return (
        <div className={styles.mccrsIDForm}>
            <Formik
                initialValues={mccrsIDInitialValues}
                onSubmit={(values) => {
                    return handleFormSubmit(values, contractSubmissionType!)
                }}
                validationSchema={() => MccrsIdFormSchema()}
            >
                {({ values, errors, handleSubmit, isSubmitting }) => (
                    <>
                        <Breadcrumbs
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
                                    text: 'MC-CRS record number',
                                    link: `/submissions/${contractSubmissionType}/${id}/mccrs-record-number`,
                                },
                            ]}
                        />
                        <UswdsForm
                            className={styles.formContainer}
                            id="MCCRSIDForm"
                            onSubmit={(e) => {
                                setShouldValidate(true)
                                handleSubmit(e)
                            }}
                        >
                            {showPageErrorMessage && <GenericApiErrorBanner />}
                            <fieldset className="usa-fieldset">
                                <h3>MC-CRS record number</h3>
                                <legend className="srOnly">
                                    Add MC-CRS record number
                                </legend>
                                <FieldTextInput
                                    name="mccrsId"
                                    id="mccrsId"
                                    label="Enter the Managed Care Contract and Rate Review System (MC-CRS) record number."
                                    showError={Boolean(
                                        showFieldErrors(errors.mccrsId)
                                    )}
                                    type="text"
                                    variant="SUBHEAD"
                                    aria-required
                                    hint={
                                        <span>
                                            (i.e <span>4375</span>)
                                        </span>
                                    }
                                />
                            </fieldset>
                            <ButtonGroup type="default">
                                <ActionButton
                                    type="submit"
                                    variant="default"
                                    data-testid="page-actions-right-primary"
                                    parent_component_type="page body"
                                    link_url={`/submission/${contractSubmissionType}/${id}`}
                                    disabled={
                                        shouldValidate && !!errors.mccrsId
                                    }
                                    animationTimeout={1000}
                                    loading={
                                        isSubmitting &&
                                        shouldValidate &&
                                        !errors.mccrsId
                                    }
                                >
                                    Save MC-CRS number
                                </ActionButton>
                            </ButtonGroup>
                        </UswdsForm>
                    </>
                )}
            </Formik>
        </div>
    )
}
