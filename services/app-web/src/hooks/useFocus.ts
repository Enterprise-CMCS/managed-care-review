import { useRef } from 'react'

// Dynamically set focus to a specific html element. The element must be present on the page on initialization.
export const useFocus = (): [
    React.MutableRefObject<HTMLButtonElement | null>,
    () => void
] => {
    const htmlElRef = useRef<HTMLButtonElement | null>(null)
    const setFocus = () => {
        htmlElRef.current && htmlElRef.current.focus()
    }

    return [htmlElRef, setFocus]
}
