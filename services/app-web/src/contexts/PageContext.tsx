import * as React from 'react'
import { PageHeadingsRecord, getRouteName } from '../constants/routes'

/*
    Use sparingly. 
    Intended for page specific context that must be shared across the application, not for data that can be fetched from the api.
*/
type PageContextType = {
    heading?: string
    updateHeading: (pathname: string, headingText?: string) => void
}

const PageContext = React.createContext((null as unknown) as PageContextType)

export type PageProviderProps = {
    children: React.ReactNode
}
const PageProvider: React.FC = ({ children }) => {
    const [heading, setHeading] = React.useState<string | undefined>(undefined)

    /* 
        Set headings in priority order
        1. If there a custom heading, use that
        2. Otherwise, use default headings based on the PageHeadingsRecord
        3. Do not show any page-specific headings when user is logged out (handled in Header component)
        4. Do not show any headings when logged in user is on a Not Found page (handled in Header component)
    */
    const updateHeading = (pathname: string, customHeading?: string) => {
        const routeName = getRouteName(pathname)
        const defaultHeading = Object.prototype.hasOwnProperty.call(
            PageHeadingsRecord,
            routeName
        )
            ? PageHeadingsRecord[routeName]
            : undefined

        setHeading((prev) => {
            if (!defaultHeading && !customHeading) return prev
            return customHeading ? customHeading : defaultHeading
        })
    }

    return (
        <PageContext.Provider
            value={{ heading, updateHeading }}
            children={children}
        />
    )
}

const usePage = (): PageContextType =>
    (React.useContext(PageContext) as unknown) as PageContextType
export { PageProvider, usePage }
