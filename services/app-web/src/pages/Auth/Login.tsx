import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'
import {
    Button,
    Form,
    FormGroup,
    Label,
    TextInput,
} from '@trussworks/react-uswds'
// import { useAppContext } from '../libs/contextLib'

import { signIn } from './cognitoAuth'

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

    // const { userHasAuthenticated } = useAppContext()
    const [isLoading, setIsLoading] = useState(false)

    const onFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = event.target
        setFields({ ...fields, [id]: value })
    }

    function validateForm() {
        return fields.loginEmail.length > 0 && fields.loginPassword.length > 0
    }

    async function handleSumbit(event: React.FormEvent) {
        event.preventDefault()

        setIsLoading(true)
        const result = await signIn(fields.loginEmail, fields.loginPassword)
        setIsLoading(false)
        if (result.isOk()) {
            console.log('SUCCESS LOGIN')
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
            <Form onSubmit={handleSumbit}>
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
                <Button
                    type="submit"
                    // isLoading={isLoading}
                    disabled={!validateForm() || isLoading}
                >
                    Login
                </Button>
            </Form>
        </div>
    )
}
