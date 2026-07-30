import React, { useEffect } from 'react'
import {
    ButtonGroup,
    Fieldset,
    FormGroup,
    Label,
    Grid,
} from '@trussworks/react-uswds'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Form as UswdsForm } from '@trussworks/react-uswds'
import { Formik, FormikErrors, useField } from 'formik'
import {
    ActionButton,
    Breadcrumbs,
    FieldCheckbox,
    FieldTextarea,
    GenericApiErrorBanner,
    Loading,
    PageActionsContainer,
    PoliteErrorMessage,
} from '../../../components'
import { FormContainer } from '../../../components'
import { useMutation, useQuery } from '@apollo/client/react'
import {
    CreateOauthClientDocument,
    IndexUsersDocument,
} from '../../../gen/gqlClient'
import type {
    IndexUsersQuery,
    OAuthScope,
    OAuthUser,
    User,
} from '../../../gen/gqlClient'
import { RoutesRecord } from '@mc-review/constants'
import { FieldSelect } from '../../../components/Select'
import { getAvailableOAuthScopesForUserRole } from '@mc-review/common-code'
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
    scopes: OAuthScope[]
}

type FormError =
    FormikErrors<CreateOauthClientFormValuesType>[keyof FormikErrors<CreateOauthClientFormValuesType>]

type IndexUserEdge = IndexUsersQuery['indexUsers']['edges'][number]
type OAuthUserIndexEdge = Omit<IndexUserEdge, 'node'> & { node: OAuthUser }

const isOAuthUser = (user: User): user is OAuthUser =>
    user.__typename === 'CMSApproverUser' ||
    user.__typename === 'CMSUser' ||
    user.__typename === 'AdminUser'

const getAvailableOauthScopes = (user?: OAuthUser): OAuthScope[] => {
    if (!user) {
        return []
    }

    return getAvailableOAuthScopesForUserRole(user.role) as OAuthScope[]
}

const ClearOauthScopesOnUserChange = (): null => {
    const [{ value: cmsUser }] = useField<FilterOptionType>('cmsUser')
    const [, , { setValue: setScopes }] = useField<OAuthScope[]>('scopes')
    const previousUserID = React.useRef(cmsUser.value)

    useEffect(() => {
        if (previousUserID.current !== cmsUser.value) {
            previousUserID.current = cmsUser.value
            void setScopes([])
        }
    }, [cmsUser.value, setScopes])

    return null
}

export const CreateOauthClient = (): React.ReactElement => {
    // Page level state
    const settingsContext = useOutletContext<MCReviewSettingsContextType>()
    const setNewOauthClient = settingsContext?.oauthClients.setNewOauthClient
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const navigate = useNavigate()
    const { updateActiveMainContent } = usePage()

    const { result: indexUsersResult } = wrapApolloResult(
        useQuery(IndexUsersDocument, {
            fetchPolicy: 'cache-and-network',
        })
    )

    const [
        createOauthClient,
        { loading: createClientLoading, error: createClientError },
    ] = useMutation(CreateOauthClientDocument)

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
                    scopes: values.scopes,
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

    if (indexUsersResult.status === 'LOADING') return <Loading centered />

    if (indexUsersResult.status === 'ERROR') {
        return <SettingsErrorAlert error={indexUsersResult.error} />
    }

    const indexUsers = indexUsersResult.data.indexUsers.edges.filter(
        (user): user is OAuthUserIndexEdge => isOAuthUser(user.node)
    )

    const dropdownOptions: FilterOptionType[] = indexUsers.map((user) => ({
        label: user.node.email,
        value: user.node.id,
    }))

    // Form setup
    const formInitialValues: CreateOauthClientFormValuesType = {
        cmsUser: {
            label: '',
            value: '',
        },
        oauthDescription: '',
        scopes: [],
    }

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
                onSubmit={onSubmit}
                validationSchema={CreateOauthClientSchema}
            >
                {({ errors, values, handleSubmit }) => {
                    const selectedUser = indexUsers.find(
                        (user) => user.node.id === values.cmsUser.value
                    )?.node
                    const availableScopes =
                        getAvailableOauthScopes(selectedUser)

                    return (
                        <Grid className={styles.maxWidthContainer}>
                            {createClientError && <GenericApiErrorBanner />}
                            <UswdsForm
                                data-testid="createOAuthClientForm"
                                id="createOauthForm"
                                onSubmit={(
                                    e: React.FormEvent<HTMLFormElement>
                                ) => {
                                    setShouldValidate(true)
                                    return handleSubmit(e)
                                }}
                            >
                                <div id="formInnerContainer">
                                    <ClearOauthScopesOnUserChange />
                                    <fieldset>
                                        <h2>Create OAuth client</h2>
                                        <legend className="srOnly">
                                            Create OAuth client
                                        </legend>
                                        <FormGroup
                                            error={showFieldErrors(
                                                errors.cmsUser
                                            )}
                                        >
                                            <Label htmlFor={'cmsUserEmail'}>
                                                OAuth client user
                                            </Label>
                                            <span className="usa-hint">
                                                Required
                                            </span>
                                            {showFieldErrors(
                                                errors.cmsUser
                                            ) && (
                                                <PoliteErrorMessage formFieldLabel="OAuth client user">
                                                    {
                                                        errors.cmsUser
                                                            ?.value as string
                                                    }
                                                </PoliteErrorMessage>
                                            )}
                                            <FieldSelect
                                                label="OAuth client user"
                                                name="cmsUser"
                                                inputId="cmsUserEmail"
                                                optionDescriptionSingular="user"
                                                dropdownOptions={
                                                    dropdownOptions
                                                }
                                                initialValues={values.cmsUser}
                                            />
                                        </FormGroup>

                                        {selectedUser && (
                                            <div
                                                className={
                                                    styles.selectedUserSummary
                                                }
                                                data-testid="selectedOAuthClientUser"
                                            >
                                                <div
                                                    className={
                                                        styles.selectedUserLabel
                                                    }
                                                >
                                                    Selected user
                                                </div>
                                                <address
                                                    className={
                                                        styles.selectedUserAddress
                                                    }
                                                >
                                                    {`${selectedUser.givenName} ${selectedUser.familyName}`}
                                                    <br />
                                                    {selectedUser.role}
                                                    <br />
                                                    {selectedUser.email}
                                                </address>
                                            </div>
                                        )}

                                        {availableScopes.length > 0 && (
                                            <FormGroup>
                                                <Fieldset
                                                    legend="OAuth client scopes"
                                                    id="oauthScopes"
                                                    className={
                                                        styles.scopeFieldset
                                                    }
                                                >
                                                    {availableScopes.map(
                                                        (scope) => (
                                                            <FieldCheckbox
                                                                id={`oauthScope-${scope}`}
                                                                key={scope}
                                                                name="scopes"
                                                                label={scope}
                                                                value={scope}
                                                                heading="OAuth client scopes"
                                                                parent_component_heading="Create OAuth client"
                                                                aria-required={
                                                                    false
                                                                }
                                                            />
                                                        )
                                                    )}
                                                </Fieldset>
                                            </FormGroup>
                                        )}

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
                                            link_url={
                                                RoutesRecord.OAUTH_CLIENTS
                                            }
                                            onClick={() =>
                                                navigate(
                                                    RoutesRecord.OAUTH_CLIENTS
                                                )
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
                    )
                }}
            </Formik>
        </FormContainer>
    )
}
