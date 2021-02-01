import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'
import {
    FormGroup,
    FormControl,
} from 'react-bootstrap'
// import { useAppContext } from '../libs/contextLib'
import { Auth } from 'aws-amplify'
import { ISignUpResult } from 'amazon-cognito-identity-js'

import { checkAuth } from './checkAuth'

export function onError(error: any): void {
    let message = error.toString()

    // Auth errors
    if (!(error instanceof Error) && error.message) {
        message = error.message
    }

    alert(message)
}

// TYPES
type User = {
    firstName: string
    lastName: string
    email: string
    password: string
}
type FormFields = {
    firstName: ''
    lastName: ''
    email: ''
    password: ''
    confirmPassword: ''
    confirmationCode: ''
}

type MaybeUser = User | null
type MaybeISignUpResult = ISignUpResult | null

type AuthStatus = 'Unknown' | 'Authenticated' | 'Unauthenticated'

// COMPONENTS
export function Signup(): React.ReactElement {
    const [fields, setFields] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        confirmationCode: '',
    })

    const [loginFields, setLoginFields] = useState({
        email: '',
        password: '',
    })

    const history = useHistory()

    const [newUser, setNewUser] = useState<MaybeISignUpResult>(null)
    const [userHasAuthenticated, setUserHasAuthenticated] = useState(false)

    // const { userHasAuthenticated } = useAppContext()
    const [isLoading, setIsLoading] = useState(false)

    const [authStatus, setAuthStatus] = useState<AuthStatus>('Unknown')

    const onFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = event.target
        setFields({ ...fields, [id]: value })
    }

    const onLoginFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = event.target
        setLoginFields({ ...loginFields, [id]: value })
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

    function validateLoginForm() {
        return loginFields.email.length > 0 && loginFields.password.length > 0;
    }

    function validateConfirmationForm() {
        return fields.confirmationCode.length > 0
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault()

        setIsLoading(true)

        try {
            const newUser = await Auth.signUp({
                username: fields.email,
                password: fields.password,
                attributes: {
                    given_name: fields.firstName,
                    family_name: fields.lastName,
                },
            })
            setIsLoading(false)
            setNewUser(newUser)
        } catch (e) {
            onError(e)
            setIsLoading(false)
        }
    }

    async function handleLoginSumbit(event: React.FormEvent) {
        event.preventDefault()

        setIsLoading(true);

        try {
            await Auth.signIn(loginFields.email, loginFields.password);
            // userHasAuthenticated(true);
            console.log("SUCCESS LOGIN")

        } catch (e) {
            if (e.code == 'UserNotConfirmedException') {
                // the user has not been confirmed, need to display the confirmation UI
                console.log('you need to confirm your account, enter the code below')
            }


            console.log(e)
            onError(e);
            setIsLoading(false);
        }
    }

    async function handleCheckAuth(event: React.FormEvent) {
        console.log('checking auth')
        event.preventDefault()

        const isAuthed = await checkAuth()

        if (isAuthed) {
            setAuthStatus('Authenticated')
        } else {
            setAuthStatus('Unauthenticated')
        }

    }

    async function handleConfirmationSubmit(event: React.FormEvent) {
        event.preventDefault()

        setIsLoading(true)

        try {
            await Auth.confirmSignUp(fields.email, fields.confirmationCode)
            await Auth.signIn(fields.email, fields.password)

            setUserHasAuthenticated(true)
            history.push('/')
        } catch (e) {
            console.log(e)

            if (e.code == 'ExpiredCodeException') {
                console.log('your code is expired, we are sending another one.')
                Auth.resendSignUp(fields.email)
            }


            onError(e)
            setIsLoading(false)
        }
    }

    function renderLoginForm() {
        return (
            <div className="Login">
                <form onSubmit={handleLoginSumbit}>
                    <FormGroup controlId="email">
                        <label htmlFor={'email'}>Email</label>
                        <FormControl
                            type="email"
                            value={loginFields.email}
                            onChange={onLoginFieldChange}
                        />
                    </FormGroup>
                    <FormGroup controlId="password">
                        <label htmlFor={'pass'}>Password</label>
                        <FormControl
                            type="password"
                            value={loginFields.password}
                            onChange={onLoginFieldChange}
                        />
                    </FormGroup>
                    <button
                        type="submit"
                        // isLoading={isLoading}
                        disabled={!validateLoginForm()}
                    >
                        Login
                    </button>
                </form>
            </div>
        )
    }

    function renderConfirmationForm() {
        return (
            <form onSubmit={handleConfirmationSubmit}>
                <FormGroup controlId="email">
                    <label htmlFor={'email'}>Email</label>
                    <FormControl
                        type="email"
                        value={fields.email}
                        onChange={onFieldChange}
                    />
                </FormGroup>
                <FormGroup controlId="confirmationCode">
                    <label htmlFor={'confCode'}>Confirmation Code</label>
                    <FormControl
                        type="tel"
                        onChange={onFieldChange}
                        value={fields.confirmationCode}
                    />
                    <span>Please check your email for the code.</span>
                </FormGroup>
                <button
                    type="submit"
                    // isLoading={isLoading}
                    disabled={!validateConfirmationForm()}
                >
                    Verify
                </button>
            </form>
        )
    }

    function renderCheckAuthForm() {
        return (
            <form onSubmit={handleCheckAuth}>
                <p>Current Auth Status: {authStatus}</p>
                <button
                    type="submit"
                >
                    Check Auth
                </button>
            </form>
        )
    }

    function renderForm() {
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
                    // isLoading={isLoading}
                    disabled={!validateForm()}
                >
                    Signup
                </button>
            </form>
        )
    }

    return (
        <div>
            <div className="Signup">
                {renderForm()}
            </div>

            <div className="Login">
                {renderLoginForm()}
            </div>

            <div className="Confirm">
                {renderConfirmationForm()}
            </div>

            <div className="CheckAuth">
                {renderCheckAuthForm()}
            </div>
        </div>
    )
}
