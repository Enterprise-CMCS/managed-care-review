import React from 'react'

import { Signup } from './Signup'
import { ConfirmSignUp } from './ConfirmSignUp'
import { Login } from './Login'
import { CheckAuth } from './CheckAuth'


// This is all my own madeup UI.

// STATUSES
// NEUTRAL
// REQUIRES_CONFIRMATION
// 

export function Auth(): React.ReactElement {

    return (
        <div>
            <div className="Signup">
                <Signup />
            </div>
            <hr />
            <div className="Login">
                <Login />
            </div>

            <div className="Confirm">
                <ConfirmSignUp />
            </div>

            <div className="CheckAuth">
                <CheckAuth />
            </div>
        </div>
    )
}
