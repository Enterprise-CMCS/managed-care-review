import {
    TealiumEnv,
} from './tealium'
import {PageTitlesRecord, RouteT, STATE_SUBMISSION_FORM_ROUTES, STATE_SUBMISSION_SUMMARY_ROUTES} from '../constants';
import {User} from '../gen/gqlClient';
import {hasCMSUserPermissions} from '../gqlHelpers';

function getTealiumEnv(stage: string): TealiumEnv {
    switch (stage) {
        case 'prod':
            return 'prod'
        case 'val':
            return 'qa'
        case 'main':
            return 'dev'
        default:
            return 'dev'
    }
}

const getTealiumPageName = ({
    route,
    heading,
    user,
}: {
    route: RouteT | 'UNKNOWN_ROUTE'
    heading: string | React.ReactElement | undefined
    user: User | undefined
}) => {
    const addSubmissionNameHeading =
        STATE_SUBMISSION_FORM_ROUTES.includes(route) ||
        STATE_SUBMISSION_SUMMARY_ROUTES.includes(route)

    const formatPageName = ({
        heading,
        title,
    }: {
        title: string
        heading?: string | React.ReactElement
    }) => {
        const headingPrefix =
            heading && addSubmissionNameHeading ? `${heading}: ` : ''
        return `${headingPrefix}${title}`
    }
    switch (route) {
        case 'ROOT':
            if (!user) {
                return formatPageName({ title: 'Home' })
            } else if (user.__typename === 'StateUser') {
                return formatPageName({
                    heading,
                    title: 'State dashboard',
                })
            } else {
                return formatPageName({ heading, title: 'CMS Dashboard' })
            }
        case 'DASHBOARD_SUBMISSIONS' || 'DASHBOARD_RATES':
            if (user && hasCMSUserPermissions(user)) {
                return formatPageName({ title: 'CMS Dashboard' })
            } else if (user && user.__typename === 'StateUser') {
                return formatPageName({
                    heading,
                    title: 'State dashboard',
                })
            }
            return formatPageName({ heading, title: PageTitlesRecord[route] })

        default:
            return formatPageName({ heading, title: PageTitlesRecord[route] })
    }
}

export { getTealiumPageName, getTealiumEnv}
