import React from 'react'
import { ButtonGroup } from '@trussworks/react-uswds'

import { PageActionsContainer } from './PageActionsContainer'
import { ActionButton } from '../../../components/ActionButton'
import { useTealium } from '../../../hooks'

/*
   This is the main call to action element displayed at the bottom of form pages.
   We have a preference to use buttons even when a link behavior (redirect) is being used. This to ensure unity of the UI and experience across pages, since different pages have different logic.
*/
type PageActionProps = {
    backOnClick: React.MouseEventHandler<HTMLButtonElement>
    saveAsDraftOnClick?: React.MouseEventHandler<HTMLButtonElement>
    continueOnClick?: React.MouseEventHandler<HTMLButtonElement> // the reason this isn't required is the continue button is a type="submit" so is can use the form onsubmit as its event handler.
    actionInProgress?: boolean // disable all buttons e.g. while an async request is taking place
    disableContinue?: boolean // disable continue when errors outside formik have occured (e.g. relating to documents)
    pageVariant?: 'FIRST' | 'LAST' | 'EDIT_FIRST' | 'STANDALONE'
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
    const isFirstPage = pageVariant === 'FIRST'
    const isLastPage = pageVariant === 'LAST'
    const isFirstPageEditing = pageVariant === 'EDIT_FIRST'
    const isStandalonePage = pageVariant === 'STANDALONE'
    const { logUserEvent } = useTealium()

    const saveAsDraftOnClickWithLogging = (
        e: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => {
        logUserEvent({ tealium_event: 'button_engagement' })
        if (saveAsDraftOnClick) saveAsDraftOnClick(e)
    }

    const leftElement =
        isFirstPage || !saveAsDraftOnClick ? undefined : (
            <ActionButton
                type="button"
                variant="linkStyle"
                disabled={actionInProgress}
                onClick={
                    actionInProgress ? undefined : saveAsDraftOnClickWithLogging
                }
                data-testid="page-actions-left-primary"
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
                    data-testid="page-actions-left-secondary"
                    disabled={actionInProgress}
                    onClick={actionInProgress ? undefined : backOnClick}
                >
                    {!isFirstPage && !isFirstPageEditing && !isStandalonePage
                        ? 'Back'
                        : 'Cancel'}
                </ActionButton>

                <ActionButton
                    type="submit"
                    variant="default"
                    data-testid="page-actions-right-primary"
                    disabled={disableContinue}
                    onClick={
                        actionInProgress || disableContinue
                            ? undefined
                            : continueOnClick
                    }
                    animationTimeout={1000}
                    loading={actionInProgress && !disableContinue}
                >
                    {!isLastPage && !isStandalonePage ? 'Continue' : 'Submit'}
                </ActionButton>
            </ButtonGroup>
        </PageActionsContainer>
    )
}
