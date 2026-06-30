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
    const [showLoading, setShowLoading] = useState(false)

    useEffect(() => {
        const timeout = setTimeout(() => {
            setShowLoading(true)
        }, delayMS)

        return function cleanup() {
            clearTimeout(timeout)
        }
    }, [delayMS])

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
