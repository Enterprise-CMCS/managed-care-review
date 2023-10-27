import React, { useState, useEffect, useMemo } from 'react'
import {
    Form as UswdsForm,
    ButtonGroup,
    GridContainer,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import { FieldTextInput } from '../../components/Form'
import { MccrsIdFormSchema } from './MccrsIdSchema'
import { recordJSException } from '../../otelHelpers/tracingHelper'
import { useNavigate, useParams } from 'react-router-dom'
import { GenericApiErrorBanner } from '../../components/Banner/GenericApiErrorBanner/GenericApiErrorBanner'
import { ActionButton } from '../../components/ActionButton'
import { usePage } from '../../contexts/PageContext'
import { Loading } from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import { Breadcrumbs } from '../../components/Breadcrumbs/Breadcrumbs'
import { RoutesRecord } from '../../constants'
import { ApolloError } from '@apollo/client'
import { handleApolloError } from '../../gqlHelpers/apolloErrors'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { Error404 } from '../Errors/Error404Page'
import {
    HealthPlanPackage,
    useUpdateContractMutation,
} from '../../gen/gqlClient'
import { useFetchHealthPlanPackageWithQuestionsWrapper } from '../../gqlHelpers'
import { packageName } from '../../common-code/healthPlanFormDataType'
import styles from './MccrsId.module.scss'

export interface MccrsIdFormValues {
    mccrsId: number | undefined
}
type FormError =
    FormikErrors<MccrsIdFormValues>[keyof FormikErrors<MccrsIdFormValues>]

type RouteParams = {
    id: string
}

export const MccrsId = (): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(true)
    const { id } = useParams<keyof RouteParams>()
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in state submission form.'
        )
    }

    const { loggedInUser } = useAuth()
    const navigate = useNavigate()

    // page context
    const { updateHeading } = usePage()
    const [pkgName, setPkgName] = useState<string | undefined>(undefined)

    const customHeading = useMemo(() => {
        return (
            <span className={styles.customHeading}>
                {pkgName}
                <span>MC-CRS record number</span>
            </span>
        )
    }, [pkgName])
    useEffect(() => {
        updateHeading({ customHeading })
    }, [customHeading, updateHeading])

    const [showPageErrorMessage, setShowPageErrorMessage] = useState<
        boolean | string
    >(false) // string is a custom error message, defaults to generic of true
    const [updateFormData] = useUpdateContractMutation()
    const { result: fetchResult } =
        useFetchHealthPlanPackageWithQuestionsWrapper(id)
    if (fetchResult.status === 'ERROR') {
        const err = fetchResult.error
        console.error('Error from API fetch', fetchResult.error)
        if (err instanceof ApolloError) {
            handleApolloError(err, true)

            if (err.graphQLErrors[0]?.extensions?.code === 'NOT_FOUND') {
                return <Error404 />
            }
        }

        recordJSException(err)
        return <GenericErrorPage /> // api failure or protobuf decode failure
    }

    if (fetchResult.status === 'LOADING') {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    const { data, revisionsLookup } = fetchResult
    const pkg = data.fetchHealthPlanPackage.pkg

    // Display generic error page if getting logged in user returns undefined.
    if (!loggedInUser) {
        return <GenericErrorPage />
    }
    const edge = pkg.revisions.find((rEdge) => rEdge.node.submitInfo)
    if (!edge) {
        const errMsg = `No currently submitted revision for this package: ${pkg.id}, programming error. `
        recordJSException(errMsg)
        return <GenericErrorPage />
    }
    const currentRevision = edge.node
    const packageData = revisionsLookup[currentRevision.id].formData
    const healthPkgName = packageName(
        packageData.stateCode,
        packageData.stateNumber,
        packageData.programIDs,
        pkg.state.programs
    )
    if (pkgName !== healthPkgName) {
        setPkgName(healthPkgName)
    }

    const mccrsIDInitialValues: MccrsIdFormValues = {
        mccrsId: pkg.mccrsID ? Number(pkg.mccrsID) : undefined,
    }

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const handleFormSubmit = async (values: MccrsIdFormValues) => {
        setShowPageErrorMessage(false)
        try {
            const updateResult = await updateFormData({
                variables: {
                    input: {
                        mccrsID:
                            values?.mccrsId?.toString().replace(/ /g, '') ||
                            undefined,
                        id: id,
                    },
                },
            })

            const updatedSubmission: HealthPlanPackage | undefined =
                updateResult?.data?.updateContract.pkg

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
                                    text: pkgName || '',
                                },
                                { text: 'MC-CRS record number' },
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
                                    disabled={
                                        shouldValidate && !!errors.mccrsId
                                    }
                                    onSubmit={() => handleFormSubmit(values)}
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
