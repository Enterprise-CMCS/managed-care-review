import { useEffect } from 'react'
import { useFormikContext } from 'formik'

/**
 * This is a renderless component
 *
 * It relies on the Formik context to work, so it must ALWAYS be rendered
 * inside of a Formik form.
 *
 * For typescript -  make sure to pass in typed props to allow component to properly infer formik context types.
 */

export function FieldPreserveScrollPosition<T>({
    fieldName,
}: {
    fieldName: keyof T
}): null {
    const { values } = useFormikContext<T>()
    const fieldValue = values[fieldName]
    useEffect(() => {
        document.querySelector(`#${fieldName}`)?.scrollIntoView()
    }, [fieldValue, fieldName])
    return null
}
