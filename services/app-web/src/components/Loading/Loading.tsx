import React, { useState, useEffect } from 'react'
import { Spinner } from '../Spinner'

import styles from './Loading.module.scss'

export const Loading = ({
    delayMS = 750,
    fullPage = false,
}: {
    delayMS?: number
    fullPage?: boolean
}): React.ReactElement | null => {
    // Full-page loaders only render on a cold load (no cached data), so show
    // the spinner immediately to hide the sidebar and avoid a flicker where
    // the page is blank with no indicator. Inline loaders keep the delay to
    // avoid a spinner flash on quick loads.
    const [showLoading, setShowLoading] = useState(fullPage)

    useEffect(() => {
        if (fullPage) {
            return
        }
        const timeout = setTimeout(() => {
            setShowLoading(true)
        }, delayMS)

        return function cleanup() {
            clearTimeout(timeout)
        }
    }, [delayMS, fullPage])

    if (!showLoading) {
        return null
    }

    return (
        <div className={fullPage ? styles.fullPageLoading : styles.loadingBox}>
            <h2 className={styles.loadingLabel}>Loading</h2>
            <Spinner />
        </div>
    )
}
