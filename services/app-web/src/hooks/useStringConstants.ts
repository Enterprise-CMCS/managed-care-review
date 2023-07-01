import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../common-code/featureFlags'

export const useStringConstants = () => {
    const ldClient = useLDClient()
    const useHelpdeskEmail = ldClient?.variation(
        featureFlags.HELPDESK_EMAIL.flag,
        featureFlags.HELPDESK_EMAIL.defaultValue
    )
    return {
        MAIL_TO_SUPPORT: useHelpdeskEmail
            ? 'MC_Review_HelpDesk@cms.hhs.gov'
            : 'mc-review@cms.hhs.gov',
    }
}
