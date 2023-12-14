# Feature brief: Session Expiration

## Introduction

We use a third-party authentication provider ([IDM](https://confluenceent.cms.gov/display/IDM/IDM+Trainings+and+Guides)) which automatically logs out sessions due to inactivity after about 30 minutes. We don't have direct access to their timekeeping, but we know this is about how long they allow a session to be inactive. Thus, we manually track sessions internally for the same time period.

## Expected behavior
 Two minutes before the session will expire due to inactivity we show a warning modal. The modal displays a live countdown and has CTA buttons with 1. the ability to log out immediately 2. the ability to extend the session. This helps us fulfill accessibility requirements around [WCAG 2.2.1 Timing Adjustable](https://www.w3.org/WAI/WCAG21/Understanding/timing-adjustable.html).

![session expiration modal](../../.images/session-expiring.png)

### Possible outcomes after the session expiration modal is displayed:
1. If the user chooses to logout, we redirect to landing page.
2. If the user extends the session, we refresh their tokens and restart our counter for the session.
3. If the user takes no action and the browser is still active, the 2 minute countdown will complete and the user will be automatically logged out and a error banner will appear on the landing page notifying them what happened.

![session expired banner - relevant for outcome 3](../../.images/session-expired-banner.png)

This auto logout behavior will happen even if the browser tab is in the background. Either way we are keep track of time and the session expiration flow will work as expected.

## Known edge cases
- The user puts computer to sleep while logged in (before session expiration modal is visible) and comes back after the session has expired.
    - In this case the session expiration modal will not display. The user will still  appear to be logged in when they relaunch their computer. However, as soon as the user takes an action that hits the API and we get a 403, we will follow the code path for outcome #3 above - automatically log the user and show the session expired error banner.
- The user has MC-Review open in multiple tabs and then logs out of only one tab manually before session expiration.
    - This is not an ideal user experience. We recommend using the application in one tab at time. In this case as the user goes to another tab that is still open and starts using the application, they will have an odd user experience. They will be able to make some limited requests with the cached user but at a certain point the requests will error (may or may not be auth errors, sometimes the API may fail first with 400s and thus the generic failed request banner will show)


##  Implementation details
- There are two evergreen feature flags (`SESSION_EXPIRING_MODAL` and `MINUTES_UNTIL_SESSION_EXPIRES`) associated with this feature.
    - This allows turning this feature off on dev and review apps since it can disrupt Cypress. Also allows us shorten the session expiration time to quickly test functionality.
    - Expect that VAL and PROD have the main session expiring modal flag turned on permanently
- Primary logic for the feature is found in `AuthContext.tsx`
    - `MODAL_COUNTDOWN_DURATION` is the hard-coded constant that holds the amount of time the modal will be visible prior to logout for inactivity. It is set to 2 minutes.
    - use of `session-timeout`query param to ensure error banner displays
    - `sessionExpirationTime` is the date and time at which the session will expire and `updateSessionExpirationTime` is the method to extend the session when the user is active
    - `setLogoutCountdownDuration` used to decrement the countdown duration for display in the modal
    - `sessionIsExpiring` boolean tracks whether we're inside the countdown duration (if true, modal is visible) this is updated with `updateSessionExpirationState`
    - `checkIfSessionsIsAboutToExpire` check current session time on an interval in the background. It determines if it is time to show modal
