import React, { useLayoutEffect, useState } from 'react'
import { Button } from '@trussworks/react-uswds'
import styles from './ExpandableText.module.scss'

export type ExpandableTextProps = {
    clamp: React.ReactElement | string // you can pass in an element with nested <span> or simple string
    clampedLines?: number
}

export const ExpandableText = ({
    clamp,
    clampedLines = 2,
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
                ref.style.webkitLineClamp = clampedLines.toString()
            }
            setShowMoreButton(true)
        }
    }, [showMoreButton, clampedLines, setShowMoreButton])

    return (
        <p {...props}>
            <span
                ref={textRef}
                data-testid="clampElement"
                aria-expanded={showMore}
                className={`usa-alert__text ${
                    showMore ? styles.textExpanded : styles.textContracted
                }`}
            >
                {typeof clamp === 'string' ? <span>{clamp}</span> : clamp}
            </span>
            {showMoreButton && (
                <Button
                    aria-hidden // hide from screenreaders
                    type="button"
                    unstyled
                    tabIndex={-1}
                    className={`${styles.showMoreButton} usa-link`}
                    onClick={() => setShowMore(!showMore)}
                >
                    {showMore ? 'Show Less' : 'Show More'}
                </Button>
            )}
        </p>
    )
}
