import { ErrorAlertFailedRequest } from '../ErrorAlert'
import { ErrorAlertSessionExpired } from '../ErrorAlert'
import { ErrorAlertSignIn } from '../ErrorAlert'
import { ErrorAlertSiteUnavailable } from '../ErrorAlert'

export default {
    title: 'Global/Banners/Error',
}

export const Error = (): React.ReactElement => (
    <div className="sb-padded">
        <ErrorAlertFailedRequest />
        <ErrorAlertSiteUnavailable />
        <ErrorAlertSignIn />
        <ErrorAlertSessionExpired />
    </div>
)
