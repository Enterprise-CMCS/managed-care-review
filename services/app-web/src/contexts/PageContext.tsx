import * as React from 'react'
import { PageHeadingsRecord } from '../constants/routes'
import { useCurrentRoute } from '../hooks/useCurrentRoute'
import { ModalRef } from '@trussworks/react-uswds'

/*
    Use sparingly.
    Intended for page specific context that must be shared across the application, not for data that can be fetched from the api.
*/
type PageContextType = {
    heading?: string | React.ReactElement
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
    const [activeModal, setActiveModal] = React.useState<React.RefObject<ModalRef>| undefined>(undefined)
    const { currentRoute: routeName } = useCurrentRoute()

    /*
        Set headings in priority order
        1. If there a custom heading, use that (relevant for heading related to the api loaded resource, such as the submission name)
        2. Otherwise, use default static headings for the current location when defined.
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

    /*
        Set a ref pointing to currently visible modal
        - is reset in child components when new modal open or back to undefined when existing modal is closed
        - help ensure only one modal open at a time
        - used in AuthenticatedRouteWrapper to close open modals when session timeout hit
    */
        const updateModalRef = ({
            updatedModalRef,
        }: {
            updatedModalRef?: React.RefObject<ModalRef>
        }) => {
           setActiveModal(updatedModalRef)
        }

    return (
        <PageContext.Provider
            value={{ heading, updateHeading, activeModalRef: activeModal, updateModalRef}}
            children={children}
        />
    )
}

const usePage = (): PageContextType =>
    React.useContext(PageContext) as unknown as PageContextType
export { PageProvider, usePage }
