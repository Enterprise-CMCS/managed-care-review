import React, { useState, useEffect } from 'react'
import { Spinner } from '@cmsgov/design-system'

import styles from './Loading.module.scss'

export const Loading = (): React.ReactElement => {
    const [showLoading, setShowLoading] = useState(false)

    useEffect(() => {
        setTimeout(() => {
            setShowLoading(true)
        }, 750)
    }, [])

    return (
        <>
            {showLoading && <h2 className={styles.loadingLabel}>Loading...</h2>}
            <Spinner />
        </>
    )
}
