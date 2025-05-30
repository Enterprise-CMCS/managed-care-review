import React, { useLayoutEffect, useState } from 'react'
import styles from './ExpandableText.module.scss'
import { ButtonWithLogging } from '../TealiumLogging'

export type ExpandableTextProps = {
    clampedLines?: number
}

export const ExpandableText = ({
    clampedLines = 2,
    children,
}: ExpandableTextProps &
    React.HTMLAttributes<HTMLParagraphElement>): React.ReactElement => {
    //We are using React.useRef because jest spyOn useRef only works like this.
    const textRef = React.useRef<HTMLParagraphElement>(null)
    const [expanded, setExpanded] = useState<boolean>(false)
    const [showMoreButton, setShowMoreButton] = useState<boolean>(false)

    useLayoutEffect(() => {
        const ref = textRef?.current

        if (
            ref &&
            (ref.offsetHeight < ref.scrollHeight ||
                ref.offsetWidth < ref.scrollWidth)
        ) {
            if (clampedLines) {
                ref.style.webkitLineClamp = clampedLines.toString()
            }
            setShowMoreButton(true)
        }
    }, [clampedLines, setShowMoreButton])

    return (
        <div className={styles.expandableBlock} aria-live="off">
            <p
                ref={textRef}
                data-testid="clampElement"
                id="expandable-text"
                aria-expanded={expanded}
                className={`usa-alert__text ${
                    expanded ? styles.textExpanded : styles.textContracted
                }`}
            >
                {children}
            </p>
            {showMoreButton && (
                <ButtonWithLogging
                    type="button"
                    unstyled
                    parent_component_type="toggle"
                    className={`${styles.showMoreButton} usa-link`}
                    onClick={() => setExpanded(!expanded)}
                    aria-expanded={expanded}
                    aria-controls="expandable-text"
                >
                    {expanded ? 'Show Less' : 'Show More'}
                </ButtonWithLogging>
            )}
        </div>
    )
}
