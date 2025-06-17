import React, { useState, useEffect } from 'react'
import {
    Form as UswdsForm,
    ButtonGroup,
    GridContainer,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import { FieldTextInput } from '../../components/Form'
import { MccrsIdFormSchema } from './MccrsIdSchema'
import { recordJSException } from '@mc-review/otel'
import { useNavigate, useParams } from 'react-router-dom'
import { GenericApiErrorBanner } from '../../components/Banner/GenericApiErrorBanner/GenericApiErrorBanner'
import { ActionButton } from '../../components/ActionButton'
import { usePage } from '../../contexts/PageContext'
import { Loading } from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import { Breadcrumbs } from '../../components/Breadcrumbs/Breadcrumbs'
import { RoutesRecord } from '@mc-review/constants'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { Error404 } from '../Errors/Error404Page'
import { ErrorForbiddenPage } from '../Errors/ErrorForbiddenPage'
import {
    useUpdateContractMutation,
    useFetchContractQuery,
    Contract,
} from '../../gen/gqlClient'
import styles from './MccrsId.module.scss'

export interface MccrsIdFormValues {
    mccrsId: number | undefined
}
type FormError =
    FormikErrors<MccrsIdFormValues>[keyof FormikErrors<MccrsIdFormValues>]

export const MccrsId = (): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(true)
    const { id } = useParams()
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in state submission form.'
        )
    }

    const { loggedInUser } = useAuth()
    const navigate = useNavigate()

    // page context
    const { updateHeading } = usePage()

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

    useEffect(() => {
        updateHeading({
            customHeading: contractName,
        })
    }, [contractName, updateHeading])

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

    const handleFormSubmit = async (values: MccrsIdFormValues) => {
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
            navigate(`/submissions/${updatedSubmission.id}`)
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
                    return handleFormSubmit(values)
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
                                    link: `/submissions/${id}`,
                                    text: contractName || '',
                                },
                                {
                                    text: 'MC-CRS record number',
                                    link: `/submissions/${id}/mccrs-record-number`,
                                },
                            ]}
                        />
                        <UswdsForm
                            className={styles.formContainer}
                            id="MCCRSIDForm"
                            aria-label="MCCRS ID Form"
                            aria-describedby="form-guidance"
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
                                    link_url={`/submissions/${id}`}
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
