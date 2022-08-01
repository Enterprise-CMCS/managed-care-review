import { HTMLAttributes, useEffect } from 'react'

type CustomScriptParams = {
    id: HTMLScriptElement['id'] // require ids to be able to reference specific scripts from React code
    src: HTMLScriptElement['src'] // require src so that script file must be defined as distinct file
    async?: HTMLScriptElement['async']
    type?: HTMLScriptElement['type']
    useInlineScriptNotSrc?: boolean
} & HTMLAttributes<HTMLScriptElement>

// Function to create custom scripts. Used to load third party js.
const createScript = ({
    type = 'text/javascript',
    id,
    src,
    useInlineScriptNotSrc,
}: CustomScriptParams): HTMLScriptElement => {
    const script = document.createElement('script')
    script.type = type
    script.id = id
    if (!useInlineScriptNotSrc) script.src = src
    return script
}

// Add script pointing to third party URL to bottom of page, with handling for a boolean flag on or off
const useScript = ({
    url,
    id,
    featureFlag,
}: {
    url: string
    id: string
    featureFlag: boolean
}): void => {
    useEffect(() => {
        if (featureFlag) {
            const script = createScript({ src: url, id })

            document.body.appendChild(script)

            return () => {
                document.body.removeChild(script)
            }
        }
    }, [url, id, featureFlag])
}

export { useScript, createScript }
