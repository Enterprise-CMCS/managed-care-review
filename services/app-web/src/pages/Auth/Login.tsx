import React, { useState } from 'react'
// import { useHistory } from 'react-router-dom'
import {
    FormGroup,
    FormControl,
} from 'react-bootstrap'
// import { useAppContext } from '../libs/contextLib'

import { signIn } from './cognitoAuth'

export function showError(error: string): void {
    alert(error)
}

// COMPONENTS
export function Login(): React.ReactElement {
    const [fields, setFields] = useState({
        email: '',
        password: '',
    })

    // const { userHasAuthenticated } = useAppContext()
    const [isLoading, setIsLoading] = useState(false)

    const onFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = event.target
        setFields({ ...fields, [id]: value })
    }


    function validateForm() {
        return fields.email.length > 0 && fields.password.length > 0;
    }

    async function handleSumbit(event: React.FormEvent) {
        event.preventDefault()

        setIsLoading(true);
        const result = await signIn(fields.email, fields.password);
        setIsLoading(false);
        if (result.isOk()) {
            console.log("SUCCESS LOGIN")    
        } else {
            const err = result.error
            console.log(err)

            if (err.code === 'UserNotConfirmedException') {
                // the user has not been confirmed, need to display the confirmation UI
                console.log('you need to confirm your account, enter the code below')
            } else if (err.code === 'NotAuthorizedException') {
                // the password is bad
                console.log('bad password')
            }
            showError(err.message);
    
        }
    }

    return (
        <div className="Login">
            <form onSubmit={handleSumbit}>
                <FormGroup controlId="email">
                    <label htmlFor={'email'}>Email</label>
                    <FormControl
                        type="email"
                        value={fields.email}
                        onChange={onFieldChange}
                    />
                </FormGroup>
                <FormGroup controlId="password">
                    <label htmlFor={'pass'}>Password</label>
                    <FormControl
                        type="password"
                        value={fields.password}
                        onChange={onFieldChange}
                    />
                </FormGroup>
                <button
                    type="submit"
                    // isLoading={isLoading}
                    disabled={!validateForm() || isLoading}
                >
                    Login
                </button>
            </form>
        </div>
    )
}
