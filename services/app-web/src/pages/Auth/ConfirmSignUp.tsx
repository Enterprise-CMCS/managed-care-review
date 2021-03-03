import React, { useState } from 'react'
import {
    Button,
    Form,
    FormGroup,
    Label,
    TextInput,
} from '@trussworks/react-uswds'

import { confirmSignUp, resendSignUp } from './cognitoAuth'

export function showError(error: string): void {
    alert(error)
}

type Props = {
    defaultEmail: string
    displayLogin: () => void
}

export function ConfirmSignUp({
    defaultEmail,
    displayLogin,
}: Props): React.ReactElement {
    const [fields, setFields] = useState({
        email: defaultEmail,
        confirmationCode: '',
    })

    const [isLoading, setIsLoading] = useState(false)

    function validateForm() {
        return fields.confirmationCode.length > 0
    }

    const onFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = event.target
        setFields({ ...fields, [id]: value })
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault()

        setIsLoading(true)

        const result = await confirmSignUp(
            fields.email,
            fields.confirmationCode
        )

        if (result.isOk()) {
            displayLogin()
        } else {
            if (result.error.code === 'ExpiredCodeException') {
                // If the code was expired, we can auto-send a new one.
                const resendResult = await resendSignUp(fields.email)

                if (resendResult.isOk()) {
                    // display that we sent a new code.
                    showError(
                        'The code you submitted was expired, we just sent another one to you.'
                    )
                }
            }
        }
        setIsLoading(false)
    }

    return (
        <Form onSubmit={handleSubmit}>
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
                <Label htmlFor="confirmationCode">Confirmation Code</Label>
                <TextInput
                    id="confirmationCode"
                    name="confirmationCode"
                    type="tel"
                    onChange={onFieldChange}
                    value={fields.confirmationCode}
                />
                <div>Please check your email for the code.</div>
            </FormGroup>
            <Button type="submit" disabled={!validateForm() || isLoading}>
                Verify
            </Button>
        </Form>
    )
}
