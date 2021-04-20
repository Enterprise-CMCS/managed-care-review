import React, { useState, useEffect } from 'react'
import { Spinner } from '../Spinner/Spinner'

import styles from './Loading.module.scss'

export const Loading = (): React.ReactElement | null => {
    const [showLoading, setShowLoading] = useState(false)

    useEffect(() => {
        setTimeout(() => {
            setShowLoading(true)
        }, 750)
    }, [])

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
