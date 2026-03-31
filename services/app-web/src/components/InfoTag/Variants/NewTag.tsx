import styles from './variants.module.scss'
import React from 'react'
import classnames from 'classnames'
import { InfoTag } from '../InfoTag'

export const NewTag = ({ className }: { className?: string }) => (
    <InfoTag className={classnames(styles.newTag, className)} color="cyan">
        NEW
    </InfoTag>
)
