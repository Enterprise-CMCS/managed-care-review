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
    alert(error)
}

type Props = {
    defaultEmail: string
}

export function Login({ defaultEmail }: Props): React.ReactElement {
    const [fields, setFields] = useState({
        loginEmail: defaultEmail,
        loginPassword: '',
    })

    const history = useHistory()
    const { isLoading, loggedInUser } = useAuth()
    if (!isLoading && loggedInUser) history.push('/dashboard')

    const onFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = event.target
        setFields({ ...fields, [id]: value })
    }

    function validateForm() {
        return fields.loginEmail.length > 0 && fields.loginPassword.length > 0
    }

    async function handleSubmit() {
        console.log('Trying a signin')

        try {
            await signIn(fields.loginEmail, fields.loginPassword)
            console.log('SUCCESS LOGIN')
        } catch (err) {
            console.log(err)

            if (err.code === 'UserNotConfirmedException') {
                console.log(
                    'you need to confirm your account, enter the code below'
                )
            } else if (err.code === 'NotAuthorizedException') {
                console.log('bad password')
            }
            showError(err.message)
        }
    }

    return (
        <div className="Login">
            <Form onSubmit={handleSubmit} name="Login">
                <FormGroup>
                    <Label htmlFor="loginEmail">Email</Label>
                    <TextInput
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
        </div>
    )
}
