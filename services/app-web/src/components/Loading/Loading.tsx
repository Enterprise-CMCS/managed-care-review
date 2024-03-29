import React, { useState, useEffect } from 'react'
import { Spinner } from '../Spinner'

import styles from './Loading.module.scss'

export const Loading = ({
    delayMS = 750,
}: {
    delayMS?: number
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
        <div className={styles.loadingBox}>
            <h2 className={styles.loadingLabel}>Loading</h2>
            <Spinner />
        </div>
    )
}
