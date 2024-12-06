import { STATE_SUBMISSION_SUMMARY_ROUTES } from "../../constants"
import { CMS_WORKFLOW_FORM_ROUTES, QUESTION_RESPONSE_FORM_ROUTES, RouteTWithUnknown, STATE_SUBMISSION_FORM_ROUTES } from "../../constants/routes"
import { User } from "../../gen/gqlClient"

const isUnlockedOrDraft=  (submissionStatus: 'UNLOCKED' | 'DRAFT' | 'SUBMITTED' | 'RESUBMITTED') => submissionStatus === 'UNLOCKED' || submissionStatus === 'DRAFT'

const shouldUseFormPageStyles = (routeName: RouteTWithUnknown, user: User, isEditablePage: boolean) => {
    const isStateUser = user.role === 'STATE_USER'
    return (STATE_SUBMISSION_FORM_ROUTES.includes(routeName) &&
        routeName !== 'SUBMISSIONS_REVIEW_SUBMIT') ||
        CMS_WORKFLOW_FORM_ROUTES.includes(routeName) ||
        QUESTION_RESPONSE_FORM_ROUTES.includes(routeName) ||
        (STATE_SUBMISSION_SUMMARY_ROUTES.includes(routeName) &&
        (isStateUser &&  isEditablePage))
    }

export {shouldUseFormPageStyles,isUnlockedOrDraft}
