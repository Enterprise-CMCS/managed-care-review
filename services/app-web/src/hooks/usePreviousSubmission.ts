import { useState, useEffect } from 'react'
import { useLocation, matchPath } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'

export const usePreviousSubmission = (): boolean => {
    const [isPreviousSubmission, setIsPreviousSubmission] =
        useState<boolean>(false)
    const { pathname } = useLocation()
    useEffect(() => {
        if (matchPath(RoutesRecord.SUBMISSIONS_REVISION, pathname)) {
            setIsPreviousSubmission(true)
        }
    }, [pathname, setIsPreviousSubmission])

    return isPreviousSubmission
}
