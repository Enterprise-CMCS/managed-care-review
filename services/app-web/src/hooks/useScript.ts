import { useEffect } from 'react'

// Add script to bottom of page, with handling for some generic boolean value to flag on or off
const useScript = (url: string, featureFlag: boolean ) => {

    useEffect(() => {
        if (featureFlag) {
            const script = document.createElement('script')

            script.src = url
            script.async = true
            script.text = 'text/javascript'

            document.body.appendChild(script)

            return () => {
                document.body.removeChild(script)
            }
        }
        
    }, [url, featureFlag])
}

export {useScript}
