import { HTMLAttributes, useEffect } from 'react'

type CustomScriptParams = {
    id: HTMLScriptElement['id'] // require ids to be able to reference specific scripts from React code
    src?: HTMLScriptElement['src'] // external url to script file, or else passed as empty string ''
    async?: HTMLScriptElement['async']
    type?: HTMLScriptElement['type']
    inlineScriptAsString?: string // defaults false, true if inline script will be appended after script node is created inDOM
} & HTMLAttributes<HTMLScriptElement>

// Function to create custom scripts. Used to load third party js.
const createScript = ({
    id,
    type = 'text/javascript',
    async = false,
    src = '',
    inlineScriptAsString,
}: CustomScriptParams): HTMLScriptElement => {

    const script = document.createElement('script')
    script.type = type
    script.id = id
    script.async = async
    if (inlineScriptAsString) script.textContent = inlineScriptAsString
    if (inlineScriptAsString && src !== '') {
        console.error('programming error: inlineScriptAsString is true but src is still passed in as if this is a third party script. Please correct src (should be empty string)')
    } else if (!inlineScriptAsString) {
        script.src = src
    }

    return script
}

// Add script pointing to third party URL to bottom of pag
const useScript = ({
    src,
    id,
    showScript,
    inlineScriptAsString
}: {
    src: string
    id: string
    showScript: boolean // useful if feature flagged
    inlineScriptAsString?: string
}): void => {

    useEffect(() => {
        if (showScript && document.getElementById(id) === null ) {
            const script = createScript({ src, id, inlineScriptAsString })
            document.head.appendChild(script)
            return () => {
                document.head.removeChild(script)
            }
        }
    }, [src, id, showScript, inlineScriptAsString])
}

export { useScript, createScript }
