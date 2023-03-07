import { useEffect, useRef, useState } from 'react'

// Intended for use with ErrorSummary component
const useErrorSummary = () => {
    const errorSummaryHeadingRef = useRef<HTMLHeadingElement>(null)
    const [focusErrorSummaryHeading, setFocusErrorSummaryHeading] = useState(false)
    
    useEffect(() => {
        // Focus the error summary heading only if we are displaying
        // validation errors and the heading element exist
        if (focusErrorSummaryHeading && errorSummaryHeadingRef.current) {
            errorSummaryHeadingRef.current.focus()
        }
        setFocusErrorSummaryHeading(false)

    }, [focusErrorSummaryHeading])

    
    return {
        setFocusErrorSummaryHeading,
        errorSummaryHeadingRef
    }
}

export { useErrorSummary }
