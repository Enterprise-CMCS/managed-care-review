import { useState, useEffect } from 'react'
import { useRouteMatch } from 'react-router-dom'
import { RoutesRecord } from '../constants/routes'

export const usePreviousSubmission = (): boolean => {
    const [isPreviousSubmission, setIsPreviousSubmission] =
        useState<boolean>(false)
    const { path } = useRouteMatch()
    useEffect(() => {
        if (path === RoutesRecord.SUBMISSIONS_REVISION) {
            setIsPreviousSubmission(true)
        }
    }, [path, setIsPreviousSubmission])

    return isPreviousSubmission
}
