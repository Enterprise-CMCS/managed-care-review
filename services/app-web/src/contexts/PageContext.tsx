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
    activeModalID?: string,
    updateHeading: ({
        customHeading,
    }: {
        customHeading?: string | React.ReactElement
    }) => void
    updateModalID: ({
        updatedModalID,
    }: {
        updatedModalID?: string
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
    const [activeModalID, setactiveModalID] = React.useState<string | undefined>(undefined)
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
        Set activeModalID - points to an instance of <Modal/>that is currently visible on the page
        - reset to undefined when the modal closed and hideen
        - reset to new string when a new modal opens
        - ensure only one modal open at a time, any new new modal opened overrides previous modal
    */
        const updateModalID = ({
            updatedModalID,
        }: {
            updatedModalID?:string
        }) => {
           setactiveModalID(updatedModalID)
        }

    return (
        <PageContext.Provider
            value={{ heading, updateHeading, activeModalID, updateModalID }}
            children={children}
        />
    )
}

const usePage = (): PageContextType =>
    React.useContext(PageContext) as unknown as PageContextType
export { PageProvider, usePage }
