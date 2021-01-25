import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'
import {
    // HelpBlock,
    FormGroup,
    FormControl,
    // label,
} from 'react-bootstrap'
// import { useAppContext } from '../libs/contextLib'
import { Auth } from 'aws-amplify'
import { ISignUpResult } from 'amazon-cognito-identity-js'

// HOOKS
// export function useFormFields(initialState: FormFields) {
//     const [fields, setValues] = useState<FormFields>(initialState)

//     return [
//         fields,
//         function (event: React.ChangeEvent) {
//             setValues({
//                 ...fields,
//                 [event.target.id]: event.target.value,
//             })
//         },
//     ]
// }

export function onError(error: any) {
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
    const history = useHistory()

    const [newUser, setNewUser] = useState<MaybeISignUpResult>(null)
    const [userHasAuthenticated, setUserHasAuthenticated] = useState(false)

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

    async function handleConfirmationSubmit(event: React.FormEvent) {
        event.preventDefault()

        setIsLoading(true)

        try {
            await Auth.confirmSignUp(fields.email, fields.confirmationCode)
            await Auth.signIn(fields.email, fields.password)

            setUserHasAuthenticated(true)
            history.push('/')
        } catch (e) {
            onError(e)
            setIsLoading(false)
        }
    }

    // function renderConfirmationForm() {
    //     return (
    //         <form onSubmit={handleConfirmationSubmit}>
    //             <FormGroup controlId="confirmationCode" bsSize="large">
    //                 <label>Confirmation Code</ControlLabel>
    //                 <FormControl
    //                     autoFocus
    //                     type="tel"
    //                     onChange={handleFieldChange}
    //                     value={fields.confirmationCode}
    //                 />
    //                 <span>Please check your email for the code.</span>
    //             </FormGroup>
    //             <LoaderButton
    //                 block
    //                 type="submit"
    //                 bsSize="large"
    //                 isLoading={isLoading}
    //                 disabled={!validateConfirmationForm()}
    //             >
    //                 Verify
    //             </LoaderButton>
    //         </form>
    //     )
    // }

    function renderForm() {
        return (
            <form onSubmit={handleSubmit}>
                <FormGroup controlId="firstName">
                    <label>First Name</label>
                    <FormControl
                        autoFocus
                        type="firstName"
                        value={fields.firstName}
                        onChange={onFieldChange}
                    />
                </FormGroup>
                <FormGroup controlId="lastName">
                    <label>Last Name</label>
                    <FormControl
                        autoFocus
                        type="lastName"
                        value={fields.lastName}
                        onChange={onFieldChange}
                    />
                </FormGroup>
                <FormGroup controlId="email">
                    <label>Email</label>
                    <FormControl
                        autoFocus
                        type="email"
                        value={fields.email}
                        onChange={onFieldChange}
                    />
                </FormGroup>
                <FormGroup controlId="password">
                    <label>Password</label>
                    <FormControl
                        type="password"
                        value={fields.password}
                        onChange={onFieldChange}
                    />
                </FormGroup>
                <FormGroup controlId="confirmPassword">
                    <label>Confirm Password</label>
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
        <div className="Signup">
            {newUser === null ? renderForm() : <p>I AM HERE and confirmed!</p>}
            {/* {newUser === null ? renderForm() : renderConfirmationForm()} */}
        </div>
    )
}
