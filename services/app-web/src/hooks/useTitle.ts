import { useEffect } from 'react'

// Useful for dynamically updates to application <title> based on page
export const useTitle = (title?: string): void => {
    useEffect(() => {
        title && (document.title = title)
    }, [title])
}
