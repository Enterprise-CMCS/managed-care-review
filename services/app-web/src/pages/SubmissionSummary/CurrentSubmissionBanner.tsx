import React from 'react'
import { Contract, UpdateInformation } from '../../gen/gqlClient'
import { SubmissionUnlockedBanner, SubmissionUpdatedBanner } from '../../components'
import styles from '../SubmissionSummary.module.scss'

export type UnlockedProps = {
    contract: Contract
    isStateUser: boolean
}

export const CurrentSubmissionBanner = ({
    contract,
    isStateUser
}: UnlockedProps): React.ReactElement => {
    const submissionStatus = contract.status
   // Get the correct update info depending on the submission status
   let updateInfo: UpdateInformation | undefined = undefined
   if (submissionStatus === 'UNLOCKED' || submissionStatus === 'RESUBMITTED') {
       updateInfo =
           (submissionStatus === 'UNLOCKED'
               ? contract.draftRevision?.unlockInfo
               : contract.packageSubmissions[0].contractRevision.submitInfo) ||
           undefined
   }

    return (
        <>
        {submissionStatus === 'UNLOCKED' && updateInfo && (
                    <SubmissionUnlockedBanner
                        userType={
                            isStateUser?
                                 'STATE_USER' :'CMS_USER'
                        }
                        unlockedBy={updateInfo.updatedBy}
                        unlockedOn={updateInfo.updatedAt}
                        reason={updateInfo.updatedReason}
                        className={styles.banner}
                    />
                )}

                {submissionStatus === 'RESUBMITTED' && updateInfo && (
                    <SubmissionUpdatedBanner
                        submittedBy={updateInfo.updatedBy}
                        updatedOn={updateInfo.updatedAt}
                        changesMade={updateInfo.updatedReason}
                        className={styles.banner}
                    />
                )}
        </>
    )
}
