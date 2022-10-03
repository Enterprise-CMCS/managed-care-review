# AuthContext and the session expiration warning modal

We use a third-party authentication provider which logs out sessions due to inactivity. We don't have direct access to their timekeeping, but we do know how long they allow a session to be inactive. We store that number in our `MINUTES_UNTIL_SESSION_EXPIRES` feature flag. We then show a warning modal some number of minutes prior to the end of the inactivity timer, with the precise number set by our `MODAL_COUNTDOWN_DURATION` feature flag.

We use several variables in AuthContext to help us do this work.

-   sessionExpirationTime: The date and time at which the session will expire
-   updateSessionExpirationTime: The method to extend the session when the user is active
-   logoutCountdownDuration: This mirrors the value of `MODAL_COUNTDOWN_DURATION`, _**converted to seconds**_
-   setLogoutCountdownDuration: The method to decrement the countdown duration for display in the modal
-   sessionIsExpiring: The boolean that tracks whether we're inside the countdown duration
-   updateSessionExpirationState: The method to set `sessionIsExpiring`
-   checkIfSessionsIsAboutToExpire: The method that checks the current time on an interval to determine if it's within `MODAL_COUNTDWON_DURATION` of the session expiration time
