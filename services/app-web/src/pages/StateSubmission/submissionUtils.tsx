import {
    RoutesRecord,
    RouteT,
    RouteTWithUnknown,
    STATE_SUBMISSION_FORM_ROUTES,
    EQRO_SUBMISSION_FORM_ROUTES,
} from '@mc-review/constants'
import { getRelativePath } from '../../routeHelpers'
import { ContractFormData, ContractSubmissionType } from '../../gen/gqlClient'

const getRelativePathFromNestedRoute = (formRouteType: RouteT): string =>
    getRelativePath({
        basePath: RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL,
        targetPath: RoutesRecord[formRouteType],
    })

const activeFormPages = (
    draft: ContractFormData,
    hideSupportingDocs?: boolean,
    contractSubmissionType?: ContractSubmissionType
): RouteTWithUnknown[] => {
    // If submission type is contract only, rate details is left out of the step indicator
    // If feature flag for hiding supporting docs is on, that documents page is left out of the
    // step indicator
    return STATE_SUBMISSION_FORM_ROUTES.filter((formPage) => {
        if (
            draft?.submissionType === 'CONTRACT_ONLY' &&
            formPage === 'SUBMISSIONS_RATE_DETAILS'
        ) {
            return false
        } else if (hideSupportingDocs && formPage === 'SUBMISSIONS_DOCUMENTS') {
            return false
        }
        return true
    })
}

type ContractFormPageProps = {
    showValidations?: boolean
}

export type { ContractFormPageProps }

export { getRelativePathFromNestedRoute, activeFormPages }
