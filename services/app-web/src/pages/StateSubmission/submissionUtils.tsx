import {
    RoutesRecord,
    RouteT,
    RouteTWithUnknown,
    STATE_SUBMISSION_FORM_ROUTES,
} from '@mc-review/constants'
import { getRelativePath } from '../../routeHelpers'
import { ContractFormData } from '../../gen/gqlClient'
import { FormikErrors } from 'formik'

const getRelativePathFromNestedRoute = (formRouteType: RouteT): string =>
    getRelativePath({
        basePath: RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL,
        targetPath: RoutesRecord[formRouteType],
    })

const activeFormPages = (
    draft: ContractFormData,
    hideSupportingDocs?: boolean
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

const renameKey = <T extends Object, K extends keyof T>(
    oldObj: FormikErrors<T>,
    oldKey: K,
    newKey: string
) => {
    const updatedObj = Object.keys(oldObj).reduce(
        (accumulator: any, currentKey) => {
            const keyInOldObj = currentKey as K
            if (keyInOldObj === oldKey) {
                accumulator[newKey] = oldObj[keyInOldObj]
            } else {
                accumulator[keyInOldObj] = oldObj[keyInOldObj]
            }
            return accumulator
        },
        {}
    )
    return updatedObj
}

type ContractFormPageProps = {
    showValidations?: boolean
}

export type { ContractFormPageProps }

export { getRelativePathFromNestedRoute, activeFormPages, renameKey }
