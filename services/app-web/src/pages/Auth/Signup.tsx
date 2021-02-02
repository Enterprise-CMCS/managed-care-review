import React, { useState, Dispatch, SetStateAction } from 'react'
import {
    FormGroup,
    FormControl,
} from 'react-bootstrap'

import { signUp } from './cognitoAuth'
import { CognitoUser } from 'amazon-cognito-identity-js'

import { logEvent } from '../../log_event'

type MaybeCognitoUser = CognitoUser | null

export function showError(error: string): void {
    alert(error)
}

type Props = {
    setEmail: Dispatch<SetStateAction<string>> // is there a better type signature for this?
    triggerConfirmation: () => void
}

export function Signup({ setEmail, triggerConfirmation }: Props): React.ReactElement {
    const [fields, setFields] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
    })

    const [newUser, setNewUser] = useState<MaybeCognitoUser>(null)
    console.log(newUser)

    // const { userHasAuthenticated } = useAppContext()
    const [isLoading, setIsLoading] = useState(false)

    const onFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = event.target
        setFields({ ...fields, [id]: value })
    }

    function validateForm() {
        return (
            fields.firstName.length > 0 &&
            fields.lastName.length > 0 &&
            fields.email.length > 0 &&
            fields.password.length > 0 &&
            fields.password === fields.confirmPassword
        )
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault()

        setIsLoading(true)

        const signUpResult = await signUp({
            username: fields.email,
            password: fields.password,
            given_name: fields.firstName,
            family_name: fields.lastName,
        })

        setIsLoading(false)
        if (signUpResult.isOk()) {
            console.log('got a user back.')
            setEmail(fields.email)
            triggerConfirmation()
            setNewUser(signUpResult.value)
        } else {
            const err = signUpResult.error
            if (err.code == 'UsernameExistsException') {
                showError('That username already exists')
            } else {
                showError('An unexpected error occured!')
                logEvent('cognitoAuth.unexpected_error', {'err.code': err.code, 'err.message': err.message})
            }
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <FormGroup controlId="firstName">
                <label htmlFor={'firstnameCon'}>First Name</label>
                <FormControl
                    type="firstName"
                    value={fields.firstName}
                    onChange={onFieldChange}
                />
            </FormGroup>
            <FormGroup controlId="lastName">
                <label htmlFor={'lastnameCon'}>Last Name</label>
                <FormControl
                    type="lastName"
                    value={fields.lastName}
                    onChange={onFieldChange}
                />
            </FormGroup>
            <FormGroup controlId="email">
                <label htmlFor={'emailCon'}>Email</label>
                <FormControl
                    type="email"
                    value={fields.email}
                    onChange={onFieldChange}
                />
            </FormGroup>
            <FormGroup controlId="password">
                <label htmlFor={'pwcon'}>Password</label>
                <FormControl
                    type="password"
                    value={fields.password}
                    onChange={onFieldChange}
                />
            </FormGroup>
            <FormGroup controlId="confirmPassword">
                <label htmlFor={'pwconfcon'}>Confirm Password</label>
                <FormControl
                    type="password"
                    onChange={onFieldChange}
                    value={fields.confirmPassword}
                />
            </FormGroup>
            <button
                type="submit"
                disabled={!validateForm() || isLoading}
            >
                Signup
            </button>
        </form>
    )
}
