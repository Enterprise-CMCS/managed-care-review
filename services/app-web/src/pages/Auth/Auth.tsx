import React, { useState } from 'react'
import { Button, GridContainer, Grid } from '@trussworks/react-uswds'

import { Signup } from './Signup'
import { ConfirmSignUp } from './ConfirmSignUp'
import { Login } from './Login'

export function Auth(): React.ReactElement {
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [enteredEmail, setEnteredEmail] = useState('')

    function toggleConfirmationForm(event: React.FormEvent) {
        event.preventDefault()
        setShowConfirmation(!showConfirmation)
    }

    return (
        <GridContainer>
            {!showConfirmation ? (
                <>
                    <Grid row>
                        <Grid col={6} className="signup">
                            <Signup
                                setEmail={setEnteredEmail}
                                triggerConfirmation={() => {
                                    setShowConfirmation(true)
                                }}
                            />
                        </Grid>
                        <Grid col={6} className="login">
                            <Login defaultEmail={enteredEmail} />
                        </Grid>
                    </Grid>
                    <Grid row>
                        <Grid col="fill">
                            <Button
                                type="button"
                                onClick={toggleConfirmationForm}
                            >
                                Enter confirmation code
                            </Button>
                        </Grid>
                    </Grid>
                </>
            ) : (
                <Grid row className="confirm">
                    <ConfirmSignUp
                        defaultEmail={enteredEmail}
                        displayLogin={() => {
                            setShowConfirmation(false)
                        }}
                    />
                    <div>
                        <Button type="button" onClick={toggleConfirmationForm}>
                            Show Signup/Login
                        </Button>
                    </div>
                </Grid>
            )}
        </GridContainer>
    )
}
