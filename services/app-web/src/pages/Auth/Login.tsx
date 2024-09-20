import React, { useState, useEffect } from 'react'
import { Form, FormGroup, Label, TextInput } from '@trussworks/react-uswds'
import { useNavigate } from 'react-router-dom'

import { signIn } from '../Auth/cognitoAuth'
import { useAuth } from '../../contexts/AuthContext'
import { ButtonWithLogging, ErrorAlertSignIn } from '../../components'
import { recordJSException } from '../../otelHelpers'
import { RoutesRecord } from '../../constants'

type Props = {
    defaultEmail?: string
}

export function Login({ defaultEmail }: Props): React.ReactElement {
    const hasSigninError = new URLSearchParams(location.search).get(
        'signin-error'
    )
    const [showFormAlert, setShowFormAlert] = React.useState(
        hasSigninError ? true : false
    )
    const [fields, setFields] = useState({
        loginEmail: defaultEmail || '',
        loginPassword: '',
    })

    const navigate = useNavigate()
    const { loginStatus, checkAuth } = useAuth()
    useEffect(() => {
        if (loginStatus === 'LOGGED_IN') {
            navigate(RoutesRecord.ROOT)
        }
    }, [loginStatus, navigate])

    const onFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = event.target
        setFields((prevFields) => ({ ...prevFields, ...fields, [id]: value }))
        if (showFormAlert) setShowFormAlert(false)
    }

    function validateForm() {
        return fields.loginEmail.length > 0 && fields.loginPassword.length > 0
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault()

        const result = await signIn(fields.loginEmail, fields.loginPassword)
        if (result instanceof Error) {
            setShowFormAlert(true)
        } else {
            // we think we signed in, double check that amplify - API connection agrees
            const authResult = await checkAuth()
            if (authResult instanceof Error) {
                recordJSException(
                    `Cognito Login Error - unexpected error after succeeding on signIn – ${authResult}`
                )
                setShowFormAlert(true)
            } else {
                navigate(RoutesRecord.ROOT)
            }
        }
    }

    return (
        <Form onSubmit={handleSubmit} name="Login" aria-label="Login Form">
            {showFormAlert && <ErrorAlertSignIn />}
            <FormGroup>
                <Label htmlFor="loginEmail">Email</Label>
                <TextInput
                    data-testid="loginEmail"
                    id="loginEmail"
                    name="loginEmail"
                    type="email"
                    value={fields.loginEmail}
                    onChange={onFieldChange}
                />
            </FormGroup>
            <FormGroup>
                <Label htmlFor="loginPassword">Password</Label>
                <TextInput
                    data-testid="loginPassword"
                    id="loginPassword"
                    name="loginPassword"
                    type="password"
                    value={fields.loginPassword}
                    onChange={onFieldChange}
                />
            </FormGroup>
            <ButtonWithLogging
                type="submit"
                parent_component_heading="page body"
                disabled={!validateForm() || loginStatus === 'LOADING'}
            >
                Login
            </ButtonWithLogging>
        </Form>
    )
}
