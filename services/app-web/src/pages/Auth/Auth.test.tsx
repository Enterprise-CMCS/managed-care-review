import React from 'react'
/*  TODO: Where will we test:
    - bad internet connection
    - bad auth (403)
    - server error (500)
*/

describe('Auth', () => {
    describe('cognito login', () => {
        it.todo('displays login forms when logged out')
        it.todo('when login is clicked, button is disabled while loading')
        it.todo('when toph is clicked, checks auth again')
        it.todo('when login is successful redirects to dashboard')
        it.todo('when login fails, display error alert')
        it.todo('when login fails, button is enabled.')
    })
    describe('local login', () => {
        // use local storage mock
        it.todo('displays ang and toph when logged out')
        it.todo('when toph is clicked, sets user in local storage')
        it.todo(
            'when toph is clicked, checks auth with cognito-authentication-provider header'
        )
        it.todo('when login is successful, redirect to dashboard')
        it.todo('when login fails, display error alert')
    })
})
