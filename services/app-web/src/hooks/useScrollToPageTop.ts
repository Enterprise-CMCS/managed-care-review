import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router'

// Scroll to top of page on load, used on every page change
export const useScrollToPageTop = () => {
    const { pathname } = useLocation()

    useLayoutEffect(() => {
        window.scrollTo(0, 0)
    }, [pathname])
}
