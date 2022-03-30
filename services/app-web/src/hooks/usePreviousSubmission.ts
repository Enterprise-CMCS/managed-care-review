import { useState, useEffect } from 'react'
import { useRouteMatch } from 'react-router-dom'
import { RoutesRecord } from '../constants/routes'

export const usePreviousSubmission = () => {
    const [isPreviousSubmission, setIsPreviousSubmission] = useState<
        boolean | null
    >(null)
    const { path } = useRouteMatch()
    useEffect(() => {
        if (path === RoutesRecord.SUBMISSIONS_REVISION) {
            setIsPreviousSubmission(true)
        }
    }, [path, setIsPreviousSubmission])

    return isPreviousSubmission
}
