import {
    FormContainer,
    FieldTextInput,
    PoliteErrorMessage,
    ActionButton,
    PageActionsContainer,
    Breadcrumbs,
    ErrorAlertSignIn,
} from '../components'
import { FieldSelect } from '../components/Select'
import type { FieldSelectOptionType } from '../components/Select/FieldSelect/FieldSelect'
import { Formik } from 'formik'
import { StateCodeType, StateCodes } from '@mc-review/submissions'
import { loginLocalUser } from './localAuth'
import { recordJSException } from '@mc-review/otel'
import { RoutesRecord } from '@mc-review/constants'
import { useAuth } from '../contexts/AuthContext'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import * as Yup from 'yup'
import { v4 as uuidv4 } from 'uuid'
import { LocalUserType } from './LocalUserType'
import {
    ButtonGroup,
    Form,
    FormGroup,
    Grid,
    Label,
} from '@trussworks/react-uswds'
import styles from './LocalLogin.module.scss'

const roleOptions = [
    { value: 'STATE_USER', label: 'State User' },
    { value: 'CMS_USER', label: 'CMS User' },
    { value: 'CMS_APPROVER_USER', label: 'CMS Approver' },
    { value: 'HELPDESK_USER', label: 'Helpdesk User' },
    { value: 'BUSINESSOWNER_USER', label: 'Business Owner' },
    { value: 'ADMIN_USER', label: 'Admin User' },
]

interface AddLocalUserFromValueType {
    email: string
    givenName: string
    familyName: string
    role: FieldSelectOptionType | null
    stateCode: FieldSelectOptionType | null
}

const stateCodeSchema = Yup.object()
    .shape({
        value: Yup.string()
            .oneOf(Array.from(StateCodes), 'You must select a valid state')
            .required(),
        label: Yup.string().required(),
    })
    .nullable()

const AddLocalUserFromVSchema = Yup.object().shape({
    email: Yup.string().email().required('email is required'),
    givenName: Yup.string().required('you must enter a first name'),
    familyName: Yup.string().required('you must enter a last name'),
    role: Yup.object()
        .shape({
            value: Yup.string()
                .oneOf(
                    roleOptions.map((r) => r.value),
                    'You must select a valid role'
                )
                .required(),
            label: Yup.string().required(),
        })
        .nullable()
        .required('You must select a role'),
    stateCode: stateCodeSchema.when('role', {
        is: (role: FieldSelectOptionType | null) =>
            role?.value === 'STATE_USER',
        then: (schema: typeof stateCodeSchema) =>
            schema.required('You must select a state for a state user'),
    }),
})

const formInitialValues: AddLocalUserFromValueType = {
    email: '',
    givenName: '',
    familyName: '',
    role: null,
    stateCode: null,
}

const AddLocalUser = () => {
    const hasSigninError = new URLSearchParams(location.search).get(
        'signin-error'
    )
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const [showFormAlert, setShowFormAlert] = React.useState(
        hasSigninError ? true : false
    )
    const navigate = useNavigate()
    const { checkAuth, loginStatus } = useAuth()

    async function login(user: AddLocalUserFromValueType) {
        const newUser = {
            id: uuidv4(),
            email: user.email,
            givenName: user.givenName,
            familyName: user.familyName,
            role: user.role?.value as LocalUserType['role'],
            stateCode:
                user.role?.value === 'STATE_USER'
                    ? (user.stateCode?.value as StateCodeType)
                    : undefined,
        } as LocalUserType

        loginLocalUser(newUser)
        const result = await checkAuth()

        if (result instanceof Error) {
            setShowFormAlert(true)
            recordJSException(result)
        } else {
            const existingUsers: LocalUserType[] = JSON.parse(
                localStorage.getItem('custom-local-users') || '[]'
            )
            existingUsers.push(newUser)
            localStorage.setItem(
                'custom-local-users',
                JSON.stringify(existingUsers)
            )
            navigate(RoutesRecord.ROOT)
        }
    }

    return (
        <FormContainer id={'addNewLocalUserForm'} className="standaloneForm">
            <Breadcrumbs
                items={[
                    {
                        link: '/',
                        text: 'MC-Review',
                    },
                    {
                        link: RoutesRecord.AUTH,
                        text: 'Auth',
                    },
                    {
                        link: '/add-new-local-user',
                        text: 'Add local user',
                    },
                ]}
            />
            <Formik
                initialValues={formInitialValues}
                onSubmit={(values) => login(values)}
                validationSchema={AddLocalUserFromVSchema}
            >
                {({ errors, values, handleSubmit }) => (
                    <Grid>
                        <Form
                            className={styles.formContainer}
                            onSubmit={(e) => {
                                setShouldValidate(true)
                                return handleSubmit(e)
                            }}
                        >
                            {showFormAlert && <ErrorAlertSignIn />}
                            <h2>Add local user</h2>
                            <fieldset className="usa-fieldset">
                                <FieldTextInput
                                    id="givenName"
                                    name="givenName"
                                    label="First name"
                                    type="text"
                                    showError={
                                        shouldValidate &&
                                        Boolean(errors.givenName)
                                    }
                                />
                                <FieldTextInput
                                    id="familyName"
                                    name="familyName"
                                    label="Last name"
                                    type="text"
                                    showError={
                                        shouldValidate &&
                                        Boolean(errors.familyName)
                                    }
                                />
                                <FieldTextInput
                                    id="email"
                                    name="email"
                                    label="Email"
                                    type="email"
                                    showError={
                                        shouldValidate && Boolean(errors.email)
                                    }
                                />
                                <FormGroup
                                    error={
                                        shouldValidate && Boolean(errors.role)
                                    }
                                >
                                    <Label
                                        htmlFor="role"
                                        error={
                                            shouldValidate &&
                                            Boolean(errors.role)
                                        }
                                    >
                                        Role
                                    </Label>
                                    {shouldValidate && errors.role && (
                                        <PoliteErrorMessage formFieldLabel="Role">
                                            {errors.role}
                                        </PoliteErrorMessage>
                                    )}
                                    <FieldSelect
                                        name="role"
                                        label="Role"
                                        isMulti={false}
                                        initialValues={[]}
                                        dropdownOptions={roleOptions}
                                        optionDescriptionSingular="role"
                                    />
                                </FormGroup>
                                {values.role?.value === 'STATE_USER' && (
                                    <FormGroup
                                        error={
                                            shouldValidate &&
                                            Boolean(errors.stateCode)
                                        }
                                    >
                                        <Label
                                            htmlFor="stateCode"
                                            error={
                                                shouldValidate &&
                                                Boolean(errors.stateCode)
                                            }
                                        >
                                            State
                                        </Label>
                                        {shouldValidate && errors.stateCode && (
                                            <PoliteErrorMessage formFieldLabel="State">
                                                {errors.stateCode}
                                            </PoliteErrorMessage>
                                        )}
                                        <FieldSelect
                                            name="stateCode"
                                            label="State"
                                            isMulti={false}
                                            initialValues={[]}
                                            dropdownOptions={StateCodes.map(
                                                (code) => ({
                                                    value: code,
                                                    label: code,
                                                })
                                            )}
                                            optionDescriptionSingular="state"
                                        />
                                    </FormGroup>
                                )}
                            </fieldset>
                            <PageActionsContainer>
                                <ButtonGroup type="default">
                                    <ActionButton
                                        type="button"
                                        variant="outline"
                                        data-testid="page-actions-left-secondary"
                                        parent_component_type="page body"
                                        onClick={() =>
                                            navigate(RoutesRecord.AUTH)
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
                                        disabled={loginStatus === 'LOADING'}
                                    >
                                        Create user
                                    </ActionButton>
                                </ButtonGroup>
                            </PageActionsContainer>
                        </Form>
                    </Grid>
                )}
            </Formik>
        </FormContainer>
    )
}

export { AddLocalUser }
