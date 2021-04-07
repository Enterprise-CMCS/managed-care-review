import React from 'react'

import styles from './Loading.module.scss'

export const Loading = (): React.ReactElement => {
    // TODO: delay
    // did mount
    // set timeout => set state

    return <h2 className={styles.loadingLabel}>Loading...</h2>
}
