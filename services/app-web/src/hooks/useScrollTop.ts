import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router'

export const useScrollTop = () => {
    const { pathname } = useLocation()

    useLayoutEffect(() => {
        window.scrollTo(0, 0)
    }, [pathname])
}
