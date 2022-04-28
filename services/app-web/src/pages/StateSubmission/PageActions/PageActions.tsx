import React from 'react'
import classNames from 'classnames'
import { ButtonGroup } from '@trussworks/react-uswds'

import styles from './PageActions.module.scss'

import { PageActionsContainer } from './PageActionsContainer'
import { ActionButton } from '../../../components/ActionButton'
/*  
   This is the main call to action element displayed at the bottom of form pages.
   We have a preference to use buttons even when a link behavior (redirect) is being used. This to ensure unity of the UI and experience across pages, since different pages have different logic. 
*/
type PageActionProps = {
    backOnClick: React.MouseEventHandler<HTMLButtonElement>
    saveAsDraftOnClick?: React.MouseEventHandler<HTMLButtonElement>
    continueOnClick?: React.MouseEventHandler<HTMLButtonElement> // the reason this isn't required is the continue button is a type="submit" so is can use the form onsubmit as its event handler.
    actionInProgress?: boolean // disable all buttons e.g. while an async request is taking place
    disableContinue?: boolean // disable continue when strange errors have occured
    pageVariant?: 'FIRST' | 'LAST' // other options could be added here as union type
}

export const PageActions = (props: PageActionProps): React.ReactElement => {
    const {
        backOnClick,
        saveAsDraftOnClick,
        continueOnClick,
        disableContinue = false,
        actionInProgress = false,
        pageVariant,
    } = props
    const classes = classNames({
        [`${styles.disabled}`]: actionInProgress,
    })
    const isFirstPage = pageVariant === 'FIRST'
    const isLastPage = pageVariant === 'LAST'
    const leftElement =
        isFirstPage || !saveAsDraftOnClick ? undefined : (
            <ActionButton
                type="button"
                variant="linkStyle"
                disabled={actionInProgress}
                onClick={actionInProgress ? undefined : saveAsDraftOnClick}
                className={classes}
            >
                Save as draft
            </ActionButton>
        )

    return (
        <PageActionsContainer left={leftElement}>
            <ButtonGroup type="default">
                <ActionButton
                    type="button"
                    variant="outline"
                    disabled={actionInProgress}
                    onClick={actionInProgress ? undefined : backOnClick}
                    className={classes}
                >
                    {!isFirstPage ? 'Back' : 'Cancel'}
                </ActionButton>

                <ActionButton
                    type="submit"
                    variant="success"
                    disabled={disableContinue}
                    onClick={actionInProgress ? undefined : continueOnClick}
                    className={classes}
                    loading={actionInProgress}
                >
                    {!isLastPage ? 'Continue' : 'Submit'}
                </ActionButton>
            </ButtonGroup>
        </PageActionsContainer>
    )
}
