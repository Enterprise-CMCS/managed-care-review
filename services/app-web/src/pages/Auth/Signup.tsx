import React, { useState, Dispatch, SetStateAction } from 'react'
import {
    Button,
    Form,
    FormGroup,
    Label,
    TextInput,
} from '@trussworks/react-uswds'

import { signUp } from './cognitoAuth'
import { recordJSException } from '../../otelHelpers'
import { useTealium } from '../../hooks'

export function showError(error: string): void {
    console.info(error)
}

type Props = {
    setEmail: Dispatch<SetStateAction<string>> // is there a better type signature for this?
    triggerConfirmation: () => void
}

export function Signup({
    setEmail,
    triggerConfirmation,
}: Props): React.ReactElement {
    const [fields, setFields] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
    })

    const [isLoading, setIsLoading] = useState(false)

    const { logButtonEvent } = useTealium()

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

        try {
            const result = await signUp({
                username: fields.email,
                password: fields.password,
                given_name: fields.firstName,
                family_name: fields.lastName,
                stateCode: 'MN',
            })
            setIsLoading(false)

            if ('code' in result) {
                const err = result
                console.info('got an error back from signup: ', err)
            } else {
                const user = result
                console.info('got a user back', user)
                setEmail(fields.email)
                triggerConfirmation()
            }
        } catch (err) {
            setIsLoading(false)
            showError('An unexpected error occurred!')
            recordJSException(new Error(err))
        }
    }

    return (
        <Form onSubmit={handleSubmit} aria-label="Signup Form">
            <FormGroup>
                <Label htmlFor="firstName">First Name</Label>
                <TextInput
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={fields.firstName}
                    onChange={onFieldChange}
                />
            </FormGroup>
            <FormGroup>
                <Label htmlFor="lastName">Last Name</Label>
                <TextInput
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={fields.lastName}
                    onChange={onFieldChange}
                />
            </FormGroup>
            <FormGroup>
                <Label htmlFor="email">Email</Label>
                <TextInput
                    id="email"
                    name="email"
                    type="email"
                    value={fields.email}
                    onChange={onFieldChange}
                />
            </FormGroup>
            <FormGroup>
                <Label htmlFor="password">Password</Label>
                <TextInput
                    id="password"
                    name="password"
                    type="password"
                    value={fields.password}
                    onChange={onFieldChange}
                />
            </FormGroup>
            <FormGroup>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <TextInput
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    onChange={onFieldChange}
                    value={fields.confirmPassword}
                />
            </FormGroup>
            <Button
                type="submit"
                disabled={!validateForm() || isLoading}
                onClick={(e) =>
                    logButtonEvent({
                        text: 'Signup',
                        button_style: 'primary',
                        button_type: 'submit',
                        parent_component_type: 'constant header',
                    })
                }
            >
                Signup
            </Button>
        </Form>
    )
}
