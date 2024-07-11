import React, { useState } from 'react'
import { GridContainer, Grid } from '@trussworks/react-uswds'

import { Signup } from './Signup'
import { ConfirmSignUp } from './ConfirmSignUp'
import { Login } from './Login'
import { ButtonWithLogging } from '../../components'

export const CognitoLogin = (): React.ReactElement => {
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [showLogin, setShowLogin] = useState(false)
    const [enteredEmail, setEnteredEmail] = useState('')
    const showForms = !showConfirmation

    const toggleConfirmationForm = (event: React.FormEvent) => {
        event.preventDefault()
        setShowConfirmation((prev) => !prev)
    }

    return showForms ? (
        <GridContainer>
            <h2>Auth Page</h2>
            <Grid row>
                {!showLogin && (
                    <Grid col={10} className="signup">
                        <h3>Signup Form</h3>
                        <Signup
                            setEmail={setEnteredEmail}
                            triggerConfirmation={() => {
                                setShowConfirmation(true)
                            }}
                        />
                    </Grid>
                )}
                {showLogin && (
                    <Grid className="login">
                        <h3>Login Form</h3>
                        <Login defaultEmail={enteredEmail} />
                    </Grid>
                )}
            </Grid>
            <Grid row className="padding-y-2">
                {!showLogin && (
                    <>
                        <ButtonWithLogging
                            type="button"
                            parent_component_heading="page body"
                            onClick={() => setShowLogin(true)}
                        >
                            Show Login Form
                        </ButtonWithLogging>

                        <ButtonWithLogging
                            type="button"
                            parent_component_heading="page body"
                            onClick={(e) => toggleConfirmationForm(e)}
                        >
                            Enter confirmation code
                        </ButtonWithLogging>
                    </>
                )}
                {showLogin && (
                    <ButtonWithLogging
                        type="button"
                        parent_component_heading="page body"
                        onClick={() => setShowLogin(false)}
                    >
                        Show Signup Form
                    </ButtonWithLogging>
                )}
            </Grid>
        </GridContainer>
    ) : (
        <GridContainer>
            <h2>Auth Page</h2>
            <h3> Enter Confirmation Code</h3>
            <ConfirmSignUp
                defaultEmail={enteredEmail}
                displayLogin={() => {
                    setShowConfirmation(false)
                }}
            />
            <div className="padding-y-2">
                <ButtonWithLogging
                    type="button"
                    parent_component_heading="page body"
                    onClick={(e) => toggleConfirmationForm(e)}
                >
                    Show Signup/ Login
                </ButtonWithLogging>
            </div>
        </GridContainer>
    )
}
