import { isWildcardPath } from './'
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

export { getRelativePath }
