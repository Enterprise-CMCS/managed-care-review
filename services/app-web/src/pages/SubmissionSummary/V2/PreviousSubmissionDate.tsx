import React from 'react'


import styles from './Loading.module.scss'
import { UpdateInformation } from '../../../gen/gqlClient'
import dayjs from 'dayjs'

export const PreviousSubmissionDate = ({
    submitInfo
}: {
    submitInfo: UpdateInformation
}): React.ReactElement | null => {
    return (
    <p
        className={styles.submissionVersion}
        data-testid="revision-version"
    >
        {`${dayjs
            .utc(submitInfo.updatedAt)
            .tz('America/New_York')
            .format('MM/DD/YY h:mma')} ET version`}
    </p>
    )
}

