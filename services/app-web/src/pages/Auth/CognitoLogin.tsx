import React, { useState } from 'react'
import { Button, GridContainer, Grid } from '@trussworks/react-uswds'

import { Signup } from './Signup'
import { ConfirmSignUp } from './ConfirmSignUp'
import { Login } from './Login'
import { useTealium } from '../../hooks'

export const CognitoLogin = (): React.ReactElement => {
    const { logButtonEvent } = useTealium()
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
                        <Button
                            type="button"
                            onClick={(e) =>
                                logButtonEvent(
                                    {
                                        text: 'Show Login Form',
                                        button_style: 'default',
                                        button_type: 'button',
                                        parent_component_heading: 'page body',
                                    },
                                    () => setShowLogin(true)
                                )
                            }
                        >
                            Show Login Form
                        </Button>

                        <Button
                            type="button"
                            onClick={(e) =>
                                logButtonEvent(
                                    {
                                        text: 'Enter confirmation code',
                                        button_style: 'default',
                                        button_type: 'button',
                                        parent_component_heading: 'page body',
                                    },
                                    () => toggleConfirmationForm(e)
                                )
                            }
                        >
                            Enter confirmation code
                        </Button>
                    </>
                )}
                {showLogin && (
                    <Button
                        type="button"
                        onClick={(e) =>
                            logButtonEvent(
                                {
                                    text: 'Show Signup Form',
                                    button_style: 'default',
                                    button_type: 'button',
                                    parent_component_heading: 'page body',
                                },
                                () => setShowLogin(false)
                            )
                        }
                    >
                        Show Signup Form
                    </Button>
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
                <Button
                    type="button"
                    onClick={(e) =>
                        logButtonEvent(
                            {
                                text: 'Login',
                                button_style: 'default',
                                button_type: 'button',
                                parent_component_heading: 'page body',
                            },
                            () => toggleConfirmationForm(e)
                        )
                    }
                >
                    Show Signup/ Login
                </Button>
            </div>
        </GridContainer>
    )
}
