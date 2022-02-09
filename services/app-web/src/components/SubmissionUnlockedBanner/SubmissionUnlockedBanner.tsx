import React from 'react'
import styles from './SubmissionUnlockedBanner.module.scss'
import { Alert } from '@trussworks/react-uswds'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js'
import advancedFormat from 'dayjs/plugin/advancedFormat.js'

dayjs.extend(advancedFormat)
dayjs.extend(timezone)

export type UnlockedProps = {
    userType: 'STATE_USER' | 'CMS_USER';
    unlockedBy: string,
    unlockedOn: Date,
    reason: string,
}

export const SubmissionUnlockedBanner = ({
    userType,
    unlockedBy,
    unlockedOn,
    reason,
}: UnlockedProps): React.ReactElement => {
    return (
        <Alert role={'alert'} type={userType === 'CMS_USER' ? 'warning' : 'info'} heading={'Submission unlocked'} validation={true}>
            <div className={styles.unlockedBanner}>
                <p><b>Unlocked by: </b>{unlockedBy}</p>
                <p><b>Unlocked on: </b>{dayjs(unlockedOn).format('MM/DD/YYYY hh:mma z')}</p>
                <p><b>Reason for unlock: </b>{reason}</p>
            </div>
        </Alert>
    )
}