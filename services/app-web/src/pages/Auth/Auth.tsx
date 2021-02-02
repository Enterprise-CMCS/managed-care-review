import React, { useState } from 'react'

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
        <div>
            {!showConfirmation ?
            <div>
                <div className="signup">
                    <Signup setEmail={setEnteredEmail} triggerConfirmation={() => {setShowConfirmation(true)}} />
                </div>
                <hr />
                <div className="login">
                    <Login defaultEmail={enteredEmail} />
                </div>
                <div>
                    <button onClick={toggleConfirmationForm}>Enter confirmation code</button>
                </div>
            </div>
                :
            <div className="confirm">
                <ConfirmSignUp defaultEmail={enteredEmail} displayLogin={() => {setShowConfirmation(false)}} />
                <div>
                    <button onClick={toggleConfirmationForm}>Show Signup/Login</button>
                </div>
            </div>
            }
        </div>
    )
}
