import React, { useLayoutEffect, useState } from 'react'
import { Button } from '@trussworks/react-uswds'
import styles from './ExpandableText.module.scss'
import { useTealium } from '../../hooks'

export type ExpandableTextProps = {
    clampedLines?: number
}

export const ExpandableText = ({
    clampedLines = 2,
    children,
}: ExpandableTextProps &
    React.HTMLAttributes<HTMLParagraphElement>): React.ReactElement => {
    //We are using React.useRef because jest spyOn useRef only works like this.
    const textRef = React.useRef<HTMLSpanElement>(null)
    const [showMore, setShowMore] = useState<boolean>(false)
    const [showMoreButton, setShowMoreButton] = useState<boolean>(false)
    const { logButtonEvent } = useTealium()

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
        <p className={styles.expandableBlock}>
            <span
                ref={textRef}
                data-testid="clampElement"
                aria-expanded={showMore}
                className={`usa-alert__text ${
                    showMore ? styles.textExpanded : styles.textContracted
                }`}
            >
                {children}
            </span>
            {showMoreButton && (
                <Button
                    aria-hidden // hide from screenreaders, they will read all the content by default and users can choose to skip ahead
                    type="button"
                    unstyled
                    tabIndex={-1}
                    className={`${styles.showMoreButton} usa-link`}
                    onClick={(e) =>
                        logButtonEvent(
                            {
                                text: showMore ? 'Show Less' : 'Show More',
                                button_style: 'link',
                                button_type: 'button',
                                parent_component_type: 'toggle',
                            },
                            () => setShowMore(!showMore)
                        )
                    }
                >
                    {showMore ? 'Show Less' : 'Show More'}
                </Button>
            )}
        </p>
    )
}
