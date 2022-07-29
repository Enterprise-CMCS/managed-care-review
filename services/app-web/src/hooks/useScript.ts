import { useEffect } from 'react'
const createScript = ({
    async = true,
    text = 'text/javascript',
    src,
    innerHTML,
}: {
    async?: HTMLScriptElement['async']
    text?: HTMLScriptElement['text']
    src?: HTMLScriptElement['src']
    innerHTML?: HTMLScriptElement['innerHTML']
}): HTMLScriptElement => {
    if (!src && !innerHTML) {
        console.error(
            'CODING ERROR: script tags must be set up with either a src or inner HTML'
        )
    }

    const script = document.createElement('script')
    script.async = async
    script.text = text
    script.src = src || ' '
    script.innerHTML = innerHTML || ''

    return script
}

// Add script pointing to third party URL to bottom of page, with handling for a boolean flag on or off
const useScript = (url: string, featureFlag: boolean): void => {
    useEffect(() => {
        if (featureFlag) {
            const script = createScript({ src: url })

            document.body.appendChild(script)

            return () => {
                document.body.removeChild(script)
            }
        }
    }, [url, featureFlag])
}

export { useScript, createScript }
