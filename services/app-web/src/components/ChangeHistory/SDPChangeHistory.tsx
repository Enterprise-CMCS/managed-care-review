import React from 'react'
import { Accordion } from '@trussworks/react-uswds'
import type { AccordionItemProps } from '@trussworks/react-uswds/lib/components/Accordion/Accordion'
import { SectionHeader } from '../SectionHeader'
import styles from './ChangeHistory.module.scss'
import { useTealium } from '../../hooks'
import { formatToPacificTime } from '@mc-review/dates'
import { getUpdatedByDisplayName } from '@mc-review/helpers'
import { dayjs } from '@mc-review/dates'

type SDPUpdateInfo = {
    updatedAt: string
    updatedReason: string
    updatedBy: {
        email: string
        role: string
        givenName: string
        familyName: string
    }
}

type SDPHistoryRevision = {
    id: string
    submitInfo?: SDPUpdateInfo | null
    unlockInfo?: SDPUpdateInfo | null
}

type FlatHistoryItem = {
    kind: 'submit' | 'unlock'
    updatedAt: string
    updatedReason: string
    updatedBy: SDPUpdateInfo['updatedBy']
}

type SDPChangeHistoryProps = {
    revisions: SDPHistoryRevision[]
}

const buildHistoryInfo = (
    item: FlatHistoryItem
): { content: JSX.Element; title: string } => {
    const isSubmit = item.kind === 'submit'
    const isInitialSubmission = item.updatedReason === 'Initial submission'
    const title = isSubmit ? 'Submission' : 'Unlock'

    if (isInitialSubmission) {
        return {
            title,
            content: (
                <div data-testid="change-history-record">
                    <span className={styles.tag}>Submitted by:</span>
                    <span>{` ${getUpdatedByDisplayName(item.updatedBy)} `}</span>
                </div>
            ),
        }
    }

    return {
        title,
        content: (
            <div data-testid="change-history-record">
                <div>
                    <span className={styles.tag}>
                        {isSubmit ? 'Submitted by: ' : 'Unlocked by: '}
                    </span>
                    <span>{`${getUpdatedByDisplayName(item.updatedBy)} `}</span>
                </div>
                <div>
                    <span className={styles.tag}>
                        {isSubmit ? 'Changes made: ' : 'Reason for unlock: '}
                    </span>
                    <span>{item.updatedReason}</span>
                </div>
            </div>
        ),
    }
}

export const SDPChangeHistory = ({
    revisions,
}: SDPChangeHistoryProps): React.ReactElement | null => {
    const { logAccordionEvent } = useTealium()

    const historyItems = revisions
        .flatMap((revision) => {
            const items: FlatHistoryItem[] = []

            if (revision.submitInfo) {
                items.push({
                    kind: 'submit',
                    updatedAt: revision.submitInfo.updatedAt,
                    updatedReason: revision.submitInfo.updatedReason,
                    updatedBy: revision.submitInfo.updatedBy,
                })
            }

            if (revision.unlockInfo) {
                items.push({
                    kind: 'unlock',
                    updatedAt: revision.unlockInfo.updatedAt,
                    updatedReason: revision.unlockInfo.updatedReason,
                    updatedBy: revision.unlockInfo.updatedBy,
                })
            }

            return items
        })
        .sort(
            (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime()
        )

    if (historyItems.length === 0) {
        return null
    }

    const revisedItems: AccordionItemProps[] = historyItems.map((item) => {
        const { content, title } = buildHistoryInfo(item)

        return {
            title: (
                <div>{`${formatToPacificTime(item.updatedAt)} - ${title}`}</div>
            ),
            headingLevel: 'h4',
            content,
            expanded: false,
            handleToggle: () => {
                logAccordionEvent({
                    event_name: 'accordion_opened',
                    heading:
                        getUpdatedByDisplayName(item.updatedBy) ?? 'unknown',
                    link_type: 'link_other',
                })
            },
            id: dayjs(item.updatedAt).toISOString(),
        }
    })

    return (
        <section id="changeHistory" className={styles.summarySection}>
            <SectionHeader
                header="Change history"
                hideBorderBottom
                hideBorderTop
            />
            <Accordion items={revisedItems} multiselectable />
        </section>
    )
}
