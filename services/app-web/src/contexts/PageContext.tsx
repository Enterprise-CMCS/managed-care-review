import * as React from 'react'
import { PageHeadingsRecord } from '@mc-review/constants'
import { useCurrentRoute } from '../hooks'
import { ModalRef } from '@trussworks/react-uswds'

/*
    Use sparingly.
    Intended for page specific context that must be shared across the application, not for data that can be fetched from the api.
*/
type PageContextType = {
    heading?: string | React.ReactElement
    activeMainContentId?: string
    activeModalRef?: React.RefObject<ModalRef>
    updateHeading: ({
        customHeading,
    }: {
        customHeading?: string | React.ReactElement
    }) => void
    updateModalRef: ({
        updatedModalRef,
    }: {
        updatedModalRef?: React.RefObject<ModalRef>
    }) => void
    updateActiveMainContent: (mainContentId: string) => void
}

const PageContext = React.createContext(null as unknown as PageContextType)

export type PageProviderProps = {
    children: React.ReactNode
}

const PageProvider: React.FC<
    React.PropsWithChildren<
        React.PropsWithChildren<React.PropsWithChildren<unknown>>
    >
> = ({ children }) => {
    const [heading, setHeading] = React.useState<
        string | React.ReactElement | undefined
    >(undefined)
    const [activeModal, setActiveModal] = React.useState<
        React.RefObject<ModalRef> | undefined
    >(undefined)
    const [activeMainContentId, setActiveMainContent] = React.useState<
        string | undefined
    >(undefined)

    const { currentRoute: routeName } = useCurrentRoute()

    /**
     * Set headings in priority order
     *    1. If there is a custom heading, use that (relevant for heading related to the api loaded resource, such as the submission name)
     *    2. Otherwise, use default static headings for the current location when defined.
     * @param customHeading
     */
    const updateHeading = ({
        customHeading,
    }: {
        customHeading?: string | React.ReactElement
    }) => {
        const defaultHeading = PageHeadingsRecord[routeName]
            ? PageHeadingsRecord[routeName]
            : undefined

        if (!defaultHeading && !customHeading) return

        setHeading((_prev) => {
            return customHeading ? customHeading : defaultHeading
        })
    }

    /**
     *  Set a ref pointing to currently visible modal
     *  - is reset in child components when new modal open or back to undefined when existing modal is closed
     *  - help ensure only one modal open at a time
     *  - used in AuthenticatedRouteWrapper to close open modals when session timeout hit
     * @param updatedModalRef
     */
    const updateModalRef = ({
        updatedModalRef,
    }: {
        updatedModalRef?: React.RefObject<ModalRef>
    }) => {
        setActiveModal(updatedModalRef)
    }

    /**
     * Set the current pages main content element, this allows the skip main content link to bypass side nav.
     * This is needed for accessibility requirements see https://webaim.org/techniques/skipnav/.
     *
     * @param mainContentId Takes string of the id. If string does not start with #, hook will prepend the id with one.
     */
    const updateActiveMainContent = (mainContentId: string) => {
        let activeMainContent = mainContentId

        // Add a # if argument did not include one. This is used as a href for skip main content link.
        if (!activeMainContent.startsWith('#')) {
            activeMainContent = `#${activeMainContent}`
        }

        setActiveMainContent(activeMainContent)
    }

    return (
        <PageContext.Provider
            value={{
                heading,
                activeMainContentId,
                updateHeading,
                activeModalRef: activeModal,
                updateModalRef,
                updateActiveMainContent,
            }}
            children={children}
        />
    )
}

const usePage = (): PageContextType =>
    React.useContext(PageContext) as unknown as PageContextType
export { PageProvider, usePage }
