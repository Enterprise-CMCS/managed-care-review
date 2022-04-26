import React from 'react'
import { Button, ButtonGroup } from '@trussworks/react-uswds'
import { PageActionsContainer } from './PageActionsContainer'
import styles from './PageActions.module.scss'
import classNames from 'classnames'

/*  
   This is the main call to action element displayed at the bottom of form pages.
   We have a preference to use buttons even when a link behavior (redirect) is being used. This to ensure unity of the UI and experience across pages, since different pages have different logic. 
*/
type PageActionProps = {
    disableAll?: boolean // disable all buttons e.g. while an async request is taking place
    backOnClick: React.MouseEventHandler<HTMLButtonElement>
    saveAsDraftOnClick?: React.MouseEventHandler<HTMLButtonElement>
    continueOnClick?: React.MouseEventHandler<HTMLButtonElement> // the reason this isn't required is the continue button is a type="submit" so is can use the form onsubmit as its event handler.
    continueDisabled?: boolean
    pageVariant?: 'FIRST' | 'LAST' // other options could be added here as union type
}

export const PageActions = (props: PageActionProps): React.ReactElement => {
    const {
        backOnClick,
        disableAll = false,
        saveAsDraftOnClick,
        continueOnClick,
        continueDisabled = false,
        pageVariant,
    } = props
    const classes = classNames({
        [`${styles.disabled}`]: disableAll,
    })
    const isFirstPage = pageVariant === 'FIRST'
    const isLastPage = pageVariant === 'LAST'
    const leftElement =
        isFirstPage || !saveAsDraftOnClick ? undefined : (
            <Button
                type="button"
                unstyled
                onClick={disableAll ? undefined : saveAsDraftOnClick}
                className={classes}
            >
                Save as draft
            </Button>
        )

    return (
        <PageActionsContainer left={leftElement}>
            <ButtonGroup type="default">
                <Button
                    type="button"
                    outline
                    onClick={disableAll ? undefined : backOnClick}
                    className={classes}
                >
                    {!isFirstPage ? 'Back' : 'Cancel'}
                </Button>

                <Button
                    type="submit"
                    disabled={continueDisabled}
                    onClick={disableAll ? undefined : continueOnClick}
                    className={classes}
                >
                    {!isLastPage ? 'Continue' : 'Submit'}
                </Button>
            </ButtonGroup>
        </PageActionsContainer>
    )
}
