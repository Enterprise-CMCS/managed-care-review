import { useEffect } from "react";

//Focuses conditionally rendered elements
export const useFocusOnRender = (isRendered: boolean, selector: string) => {
  useEffect(() => {
          const elementRef: HTMLElement | null = document.querySelector(selector)
          if(isRendered && elementRef) {
            elementRef.focus()
          } else {
              console.info('Attempting to focus element that does not exist')
          }
      }, [isRendered, selector])
}