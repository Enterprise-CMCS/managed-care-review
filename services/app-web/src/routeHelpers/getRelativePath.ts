import { isWildcardPath } from './'
import {
    ContractSubmissionTypeRecord,
    RoutesRecord,
    RouteT,
} from '@mc-review/constants'
import { ContractSubmissionType } from '../gen/gqlClient'
/*
    Calculate the relative path string from a nested route pathname

    @param targetPath - the full pathname we would like to calculate a relative path from -  e.g. /submissions/:id/edit/type
    @param basePath -  substring to remove - e.g. /submissions/:id/edit
    @returns substring of the targetPath relative to basePath -  e.g. '/type'
    
    Will return the full target pathname when no relative path can be calculated from the parameters.
*/
const getRelativePath = ({
    basePath,
    targetPath,
}: {
    basePath: string
    targetPath: string
}): string => {
    // remove wildcard /* if present
    if (isWildcardPath(basePath)) {
        const cleaned = basePath.slice(0, -2)
        return targetPath.replace(cleaned, '')
    } else {
        return targetPath.replace(basePath, '')
    }
}

/**
 * Generates a route path with the contractSubmissionType parameter replaced
 * while preserving other dynamic segments (e.g., :id).
 *
 * @param route - The route key from RoutesRecord
 * @param contractSubmissionType - The submission type to substitute into the path
 * @param [id] - The submission contract ID to substitute into the path
 * @param [rateID] - The submission rate ID to substitute into the path
 * @returns The route path with contractSubmissionType replaced (e.g., '/submissions/health-plan/:id')
 */
const getSubmissionPath = (
    route: RouteT,
    contractSubmissionType: ContractSubmissionType,
    id?: string,
    rateID?: string
) => {
    let pathWithParams = RoutesRecord[route].replace(
        ':contractSubmissionType',
        ContractSubmissionTypeRecord[contractSubmissionType]
    )

    if (id) {
        pathWithParams = pathWithParams.replace(':id', id)
    }

    if (rateID) {
        pathWithParams = pathWithParams.replace(':rateID', rateID)
    }

    return pathWithParams
}

export { getRelativePath, getSubmissionPath }
