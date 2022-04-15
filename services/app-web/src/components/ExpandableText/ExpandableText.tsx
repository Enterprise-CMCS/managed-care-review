import React, { useLayoutEffect, useState } from 'react'
import styles from './ExpandableText.module.scss'

export type ExpandableTextProps = {
    clamp: React.ReactElement | string
    clampedLines?: string
}

export const ExpandableText = ({
    clamp,
    clampedLines = '2',
    ...props
}: ExpandableTextProps &
    React.HTMLAttributes<HTMLDivElement>): React.ReactElement => {
    //We are using React.useRef because jest spyOn useRef only works like this.
    const textRef = React.useRef<HTMLDivElement>(null)
    const [showMore, setShowMore] = useState<boolean>(false)
    const [showMoreButton, setShowMoreButton] = useState<boolean>(false)

    useLayoutEffect(() => {
        const ref = textRef?.current
        if (
            ref &&
            (ref.offsetHeight < ref.scrollHeight ||
                ref.offsetWidth < ref.scrollWidth)
        ) {
            if (clampedLines) {
                ref.style.webkitLineClamp = clampedLines
            }
            setShowMoreButton(true)
        }
    }, [showMoreButton, clampedLines, setShowMoreButton])

    return (
        <div {...props}>
            <div
                ref={textRef}
                data-testid="clampElement"
                aria-expanded={showMore}
                className={`usa-alert__text ${
                    showMore ? styles.textExpanded : styles.textContracted
                }`}
            >
                {typeof clamp === 'string' ? <p>{clamp}</p> : clamp}
            </div>
            {showMoreButton && (
                <button
                    aria-hidden
                    tabIndex={-1}
                    className={`${styles.showMoreButton} usa-link`}
                    onClick={() => setShowMore(!showMore)}
                >
                    {showMore ? 'Show Less' : 'Show More'}
                </button>
            )}
        </div>
    )
}
