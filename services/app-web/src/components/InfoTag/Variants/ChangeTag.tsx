import React from 'react'
import { NewTag } from './NewTag'
import { UpdatedTag } from './UpdatedTag'

// Revision-history change indicators shown on the Submission Summary page.
export type ChangeTagType = 'NEW' | 'UPDATED'

export const ChangeTag = ({
    tag,
    className,
}: {
    tag: ChangeTagType
    className?: string
}) =>
    tag === 'NEW' ? (
        <NewTag className={className} />
    ) : (
        <UpdatedTag className={className} />
    )
