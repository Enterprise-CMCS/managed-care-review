// Determine if route path contains a wildcard *
// e.g. evaluates true for /submissions/:id/edit/* and false for /submissions/new

const isWildcardPath = (pathname: string): boolean =>
    pathname.charAt(pathname.length - 1) === '*'

export { isWildcardPath }
