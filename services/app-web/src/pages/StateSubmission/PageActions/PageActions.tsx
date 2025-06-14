import React from 'react'
import { ButtonGroup } from '@trussworks/react-uswds'

import { PageActionsContainer } from './PageActionsContainer'
import { ActionButton } from '../../../components/ActionButton'

/*
   This is the main call to action element displayed at the bottom of form pages.
   We have a preference to use buttons even when a link behavior (redirect) is being used. This to ensure unity of the UI and experience across pages, since different pages have different logic.
*/
type PageActionProps = {
    backOnClick: React.MouseEventHandler<HTMLButtonElement>
    backOnClickUrl?: string // this is used for logging the navigation urls to tealium
    saveAsDraftOnClick?: React.MouseEventHandler<HTMLButtonElement>
    saveAsDraftOnClickUrl?: string // this is used for logging the navigation urls to tealium
    continueOnClick?: React.MouseEventHandler<HTMLButtonElement> // the reason this isn't required is the continue button is a type="submit" so is can use the form onsubmit as its event handler.
    continueOnClickUrl?: string // this is used for logging the navigation urls to tealium
    actionInProgress?: boolean // disable all buttons e.g. while an async request is taking place
    disableContinue?: boolean // disable continue when errors outside formik have occured (e.g. relating to documents)
    pageVariant?: 'FIRST' | 'LAST' | 'EDIT_FIRST' | 'STANDALONE'
}

export const PageActions = (props: PageActionProps): React.ReactElement => {
    const {
        backOnClick,
        backOnClickUrl,
        saveAsDraftOnClick,
        saveAsDraftOnClickUrl,
        continueOnClick,
        continueOnClickUrl,
        disableContinue = false,
        actionInProgress = false,
        pageVariant,
    } = props
    const isFirstPage = pageVariant === 'FIRST'
    const isLastPage = pageVariant === 'LAST'
    const isFirstPageEditing = pageVariant === 'EDIT_FIRST'
    const isStandalonePage = pageVariant === 'STANDALONE'

    const leftElement =
        isFirstPage || !saveAsDraftOnClick ? undefined : (
            <ActionButton
                type="button"
                variant="linkStyle"
                disabled={actionInProgress}
                onClick={actionInProgress ? undefined : saveAsDraftOnClick}
                parent_component_type="page body"
                data-testid="page-actions-left-primary"
                link_url={saveAsDraftOnClickUrl}
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
                    parent_component_type="page body"
                    onClick={actionInProgress ? undefined : backOnClick}
                    link_url={backOnClickUrl}
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
                    parent_component_type="page body"
                    onClick={
                        actionInProgress || disableContinue
                            ? undefined
                            : continueOnClick
                    }
                    animationTimeout={1000}
                    loading={actionInProgress && !disableContinue}
                    link_url={continueOnClickUrl}
                >
                    {!isLastPage && !isStandalonePage ? 'Continue' : 'Submit'}
                </ActionButton>
            </ButtonGroup>
        </PageActionsContainer>
    )
}
