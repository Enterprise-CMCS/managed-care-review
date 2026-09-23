import styles from './variants.module.scss'
import React from 'react'
import classnames from 'classnames'
import { InfoTag } from '../InfoTag'

export const UpdatedTag = ({ className }: { className?: string }) => (
    <InfoTag className={classnames(styles.updatedTag, className)} color="gold">
        UPDATED
    </InfoTag>
)
