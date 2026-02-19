import {
    RoutesRecord,
    RouteT,
    RouteTWithUnknown,
    STATE_SUBMISSION_FORM_ROUTES,
} from '@mc-review/constants'
import { getRelativePath } from '../../routeHelpers'
import { ContractFormData } from '../../gen/gqlClient'
import dayjs from 'dayjs'

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

/**
 * Generic function that takes in an object and renames a top level key while preserving order
 * @param obj The object that needs to be modified
 * @param oldKey The old key name
 * @param newKey The replacement key name
 */
const renameKey = <T extends Object, K extends keyof T>(
    obj: T,
    oldKey: K,
    newKey: string
) => {
    const updatedObj = Object.keys(obj).reduce(
        (accumulator: any, currentKey) => {
            const keyInObj = currentKey as K
            if (keyInObj === oldKey) {
                accumulator[newKey] = obj[keyInObj]
            } else {
                accumulator[keyInObj] = obj[keyInObj]
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

function formattedDatePlusOneDay(initialValue: string): string {
    const dayjsValue = dayjs(initialValue)
    return initialValue && dayjsValue.isValid()
        ? dayjsValue.add(1, 'day').format('YYYY-MM-DD')
        : initialValue // preserve undefined to show validations later
}

function formattedDateMinusOneDay(initialValue: string): string {
    const dayjsValue = dayjs(initialValue)
    return initialValue && dayjsValue.isValid()
        ? dayjsValue.subtract(1, 'day').format('YYYY-MM-DD')
        : initialValue // preserve undefined to show validations later
}

const isCompleteDate = (val: string): boolean => {
    // Date entry has to match MM/DD/YYYY with a 4-digit year
    return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val.trim())
}

export type { ContractFormPageProps }

export {
    getRelativePathFromNestedRoute,
    activeFormPages,
    renameKey,
    formattedDatePlusOneDay,
    formattedDateMinusOneDay,
    isCompleteDate,
}
