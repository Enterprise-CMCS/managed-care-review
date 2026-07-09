import React, { useState, useEffect } from 'react'
import { Spinner } from '../Spinner'

import styles from './Loading.module.scss'

export const Loading = ({
    delayMS = 750,
    fullPage = false,
    centered = false,
}: {
    delayMS?: number
    fullPage?: boolean
    // Centers the spinner within its content container (in-flow, transparent).
    // Use when a surrounding nav/sidebar must stay visible during load, unlike
    // `fullPage` which paints an opaque overlay over everything.
    centered?: boolean
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

    const className = fullPage
        ? styles.fullPageLoading
        : centered
          ? styles.centeredLoading
          : styles.loadingBox

    return (
        <div className={className}>
            <h2 className={styles.loadingLabel}>Loading</h2>
            <Spinner />
        </div>
    )
}
