import * as React from 'react'

/*
    Stores page specific context that must be shared across the application 
    such as the presence of a dynamic page heading
*/
type PageContextType = {
    heading?: string
    updateHeading: (headingText?: string) => void
}

const PageContext = React.createContext((null as unknown) as PageContextType)

export type PageProviderProps = {
    children: React.ReactNode
}
const PageProvider: React.FC = ({ children }) => {
    const [heading, setHeading] = React.useState<string | undefined>(undefined)

    const updateHeading = (text?: string) => setHeading(text)
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
