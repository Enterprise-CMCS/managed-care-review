import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'
import { signIn } from '../Auth/cognitoAuth'
import {
    Button,
    Form,
    FormGroup,
    Label,
    TextInput,
} from '@trussworks/react-uswds'

import { useAuth } from '../../contexts/AuthContext'

export function showError(error: string): void {
    alert(error)
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
    const auth = useAuth()

    const onFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = event.target
        setFields({ ...fields, [id]: value })
    }

    function validateForm() {
        return fields.loginEmail.length > 0 && fields.loginPassword.length > 0
    }

    async function handleSubmit(event: React.FormEvent) {
        console.log('Trying a signin')
        event.preventDefault()

        const result = await signIn(fields.loginEmail, fields.loginPassword)
        // TODO: try and useAuth() here, track state using the loading param there instead of awaiting something.
        // if loading, show "redirecting" spinner or something.
        // if loggedInUser, redirect

        if (result.isOk()) {
            console.log('SUCCESS LOGIN')

            try {
                await auth.checkAuth()
            } catch (e) {
                console.log('UNEXPECTED NOT LOGGED IN AFTETR LOGGIN', e)
            }

            history.push('/dashboard')
        } else {
            const err = result.error
            console.log(err)

            if (err.code === 'UserNotConfirmedException') {
                // the user has not been confirmed, need to display the confirmation UI
                console.log(
                    'you need to confirm your account, enter the code below'
                )
            } else if (err.code === 'NotAuthorizedException') {
                // the password is bad
                console.log('bad password')
            }
            showError(err.message)
        }
    }

    return (
        <div className="Login">
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
                <Button
                    type="submit"
                    disabled={!validateForm() || auth.isLoading}
                >
                    Login
                </Button>
            </Form>
        </div>
    )
}
