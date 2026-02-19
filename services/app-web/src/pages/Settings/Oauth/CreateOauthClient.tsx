import React, { useEffect } from 'react'
import {
    ButtonGroup,
    FormGroup,
    GridContainer,
    Label,
    Grid,
} from '@trussworks/react-uswds'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Form as UswdsForm } from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import {
    ActionButton,
    Breadcrumbs,
    FieldTextarea,
    GenericApiErrorBanner,
    Loading,
    PageActionsContainer,
    PoliteErrorMessage,
} from '../../../components'
import { FormContainer } from '../../../components'
import {
    useCreateOauthClientMutation,
    useIndexUsersQuery,
} from '../../../gen/gqlClient'
import { RoutesRecord } from '@mc-review/constants'
import { FieldSelect } from '../../../components/Select'
import { wrapApolloResult } from '@mc-review/helpers'
import { SettingsErrorAlert } from '../SettingsErrorAlert'
import { FilterOptionType } from '../../../components/FilterAccordion'
import styles from './CreateOauthClient.module.scss'
import * as Yup from 'yup'
import { recordJSException } from '@mc-review/otel'
import { MCReviewSettingsContextType } from '../Settings'
import { usePage } from '../../../contexts/PageContext'

const CreateOauthClientSchema = Yup.object().shape({
    cmsUser: Yup.object().shape({
        label: Yup.string().required(
            'You must select a user with an email to be associated with this OAuth client.'
        ),
        value: Yup.string().required(
            'You must select a user to be associated with this OAuth client.'
        ),
    }),
    oauthDescription: Yup.string().optional(),
})

export interface CreateOauthClientFormValuesType {
    cmsUser: FilterOptionType
    oauthDescription?: string
}

type FormError =
    FormikErrors<CreateOauthClientFormValuesType>[keyof FormikErrors<CreateOauthClientFormValuesType>]

export const CreateOauthClient = (): React.ReactElement => {
    // Page level state
    const settingsContext = useOutletContext<MCReviewSettingsContextType>()
    const setNewOauthClient = settingsContext?.oauthClients.setNewOauthClient
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const navigate = useNavigate()
    const { updateActiveMainContent } = usePage()

    const { result: indexUsersResult } = wrapApolloResult(
        useIndexUsersQuery({
            fetchPolicy: 'cache-and-network',
        })
    )

    const [
        createOauthClient,
        { loading: createClientLoading, error: createClientError },
    ] = useCreateOauthClientMutation()

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent('createOauthForm')
    }, [updateActiveMainContent])     

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const onSubmit = async (values: CreateOauthClientFormValuesType) => {
        const oauthClient = await createOauthClient({
            variables: {
                input: {
                    userID: values.cmsUser.value,
                    description: values.oauthDescription,
                },
            },
        })

        if (oauthClient instanceof Error) {
            recordJSException(oauthClient)
        } else {
            setNewOauthClient(oauthClient.data?.createOauthClient.oauthClient)
            navigate(
                `${RoutesRecord.OAUTH_CLIENTS}/?submit=create-oauth-client`
            )
        }
    }

    if (indexUsersResult.status === 'LOADING')
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )

    if (indexUsersResult.status === 'ERROR') {
        return <SettingsErrorAlert error={indexUsersResult.error} />
    }

    const indexUsers = indexUsersResult.data.indexUsers.edges
    const dropdownOptions: FilterOptionType[] = []

    // Form setup
    const formInitialValues = {
        cmsUser: {
            label: '',
            value: '',
        },
        oauthDescription: '',
    }

    indexUsers.forEach((user) => {
        if (
            user.node.__typename === 'CMSApproverUser' ||
            user.node.__typename === 'CMSUser'
        ) {
            dropdownOptions.push({
                label: user.node.email,
                value: user.node.id,
            })
        }
    })

    return (
        <FormContainer id="createOauthForm" className="standaloneForm">
            <Breadcrumbs
                items={[
                    {
                        link: RoutesRecord.DASHBOARD_SUBMISSIONS,
                        text: 'Dashboard',
                    },
                    {
                        link: RoutesRecord.MCR_SETTINGS,
                        text: 'MC-Review settings',
                    },
                    {
                        link: RoutesRecord.OAUTH_CLIENTS,
                        text: 'OAuth clients',
                    },
                    {
                        link: RoutesRecord.CREATE_OAUTH_CLIENT,
                        text: 'Create Oauth client',
                    },
                ]}
            />
            <Formik
                initialValues={formInitialValues}
                onSubmit={(values) => onSubmit(values)}
                validationSchema={CreateOauthClientSchema}
            >
                {({ errors, handleChange, values, handleSubmit }) => (
                    <Grid className={styles.maxWidthContainer}>
                        {createClientError && <GenericApiErrorBanner />}
                        <UswdsForm
                            data-testid="createOAuthClientForm"
                            id="createOauthForm"
                            onSubmit={(e) => {
                                setShouldValidate(true)
                                return handleSubmit(e)
                            }}
                        >
                            <div id="formInnerContainer">
                                <fieldset>
                                    <h2>Create OAuth client</h2>
                                    <legend className="srOnly">
                                        Create OAuth client
                                    </legend>
                                    <FormGroup
                                        error={showFieldErrors(errors.cmsUser)}
                                    >
                                        <Label htmlFor={'cmsUserEmail'}>
                                            OAuth client user
                                        </Label>
                                        <span className="usa-hint">
                                            Required
                                        </span>
                                        {showFieldErrors(errors.cmsUser) && (
                                            <PoliteErrorMessage formFieldLabel="OAuth client user">
                                                {
                                                    errors.cmsUser
                                                        ?.value as string
                                                }
                                            </PoliteErrorMessage>
                                        )}
                                        <FieldSelect
                                            label="CMS User"
                                            name="cmsUser"
                                            inputId="cmsUserEmail"
                                            optionDescriptionSingular="user"
                                            dropdownOptions={dropdownOptions}
                                            initialValues={values.cmsUser}
                                        />
                                    </FormGroup>
                                    <FieldTextarea
                                        label="Description for OAuth client"
                                        name="oauthDescription"
                                        id="oauthDescription"
                                        hint="Provide a description for this OAuth client."
                                        showError={showFieldErrors(
                                            errors.oauthDescription
                                        )}
                                    />
                                </fieldset>
                            </div>

                            <PageActionsContainer>
                                <ButtonGroup type="default">
                                    <ActionButton
                                        type="button"
                                        variant="outline"
                                        data-testid="page-actions-left-secondary"
                                        parent_component_type="page body"
                                        link_url={RoutesRecord.OAUTH_CLIENTS}
                                        onClick={() =>
                                            navigate(RoutesRecord.OAUTH_CLIENTS)
                                        }
                                    >
                                        Cancel
                                    </ActionButton>

                                    <ActionButton
                                        type="submit"
                                        variant="success"
                                        data-testid="page-actions-right-primary"
                                        parent_component_type="page body"
                                        animationTimeout={1000}
                                        loading={createClientLoading}
                                    >
                                        Create client
                                    </ActionButton>
                                </ButtonGroup>
                            </PageActionsContainer>
                        </UswdsForm>
                    </Grid>
                )}
            </Formik>
        </FormContainer>
    )
}
