import React, { useState } from 'react'
import {
    Button,
    Form,
    FormGroup,
    Label,
    TextInput,
} from '@trussworks/react-uswds'
import { useHistory } from 'react-router-dom'

import { signIn } from '../Auth/cognitoAuth'
import { useAuth } from '../../contexts/AuthContext'

export function showError(error: string): void {
    console.log('showError', error)
}

type Props = {
    defaultEmail?: string
}

export function Login({ defaultEmail }: Props): React.ReactElement {
    const [fields, setFields] = useState({
        loginEmail: defaultEmail || '',
        loginPassword: '',
    })

    const history = useHistory()
    const { isLoading, loggedInUser, checkAuth } = useAuth()
    if (!isLoading && loggedInUser) history.push('/dashboard')

    const onFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = event.target
        setFields({ ...fields, [id]: value })
    }

    function validateForm() {
        return fields.loginEmail.length > 0 && fields.loginPassword.length > 0
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault()

        try {
            await signIn(fields.loginEmail, fields.loginPassword)
            // TODO: try and useAuth() here, track state using the loading param there instead of awaiting something.
            // if loading, show "redirecting" spinner or something.
            // if loggedInUser, redirect

            try {
                await checkAuth()
            } catch (e) {
                console.log('UNEXPECTED NOT LOGGED IN AFTETR LOGGIN', e)
            }

            history.push('/dashboard')
        } catch (err) {
            if (err?.code === 'UserNotConfirmedException') {
                // the user has not been confirmed, need to display the confirmation UI
                console.log(
                    'you need to confirm your account, enter the code below'
                )
            } else if (err?.code === 'NotAuthorizedException') {
                // the password is bad
                console.log('bad password')
            }
            showError(err)
        }
    }

    return (
        <Form onSubmit={handleSubmit} name="Login" aria-label="Login Form">
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
            <Button type="submit" disabled={!validateForm() || isLoading}>
                Login
            </Button>
        </Form>
    )
}
