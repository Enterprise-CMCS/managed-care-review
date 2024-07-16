import classNames from 'classnames'
import classnames from 'classnames'
import React from 'react'
import styles from './ErrorSummary.module.scss'
import { LinkWithLogging } from '../../TealiumLogging/Link'

type ErrorSummaryMessageProps = {
    errorKey: string
    message: string
}
const ErrorSummaryMessage = ({
    errorKey,
    message,
}: ErrorSummaryMessageProps): React.ReactElement => {
    let fieldSelector: string
    let href: string

    // Treat keys that begin with # as ids - this is used with react-select Select-  a combobox component
    if (errorKey.startsWith('#')) {
        const id = errorKey.substring(1)
        fieldSelector = `[id="${id}"]`
        href = errorKey

        // Otherwise, assume that keys correspond to name attributes and ids
    } else {
        href = '#' + errorKey
        fieldSelector = `[name="${errorKey}"]`
    }

    return (
        <LinkWithLogging
            href={href}
            className={classnames(styles.message)}
            data-testid="error-summary-message"
            onClick={(event) => {
                const fieldElement: HTMLElement | null =
                    document.querySelector(fieldSelector)

                if (fieldElement) {
                    event.preventDefault()
                    fieldElement.focus()
                }
            }}
        >
            {message}
        </LinkWithLogging>
    )
}

function summaryHeading(numberOfErrors: number) {
    if (numberOfErrors === 1) {
        return 'There is 1 error on this page'
    } else {
        return `There are ${numberOfErrors} errors on this page`
    }
}

function flattenMessage(message: string | string[]) {
    if (typeof message === 'string') {
        return message
    }

    return message.join(' and ')
}

export type ErrorSummaryProps = {
    errors: { [field: string]: string | string[] }
    headingRef?: React.Ref<HTMLHeadingElement>
}

/**
 * This component renders a list of validation errors.
 *
 * Each message will render a button that will focus the relevant field
 * when it is clicked.
 *
 * This component relies on the errors object returned by Formik, so it should generally
 * rendered inside of a Formik form context.
 *
 * By default, keys in the errors property are assumed to correspond to the name attribute
 * of the relevant form inputs. By passing a key that begins with a number sign ("#"),
 * you can have it treated as an ID. This is useful when you want to focus something that
 * doesn't have a name attribute when an error message is clicked.
 */
export const ErrorSummary = ({
    errors,
    headingRef,
}: ErrorSummaryProps): React.ReactElement | null => {
    const numberOfErrors = Object.keys(errors).length

    if (numberOfErrors === 0) {
        return null
    }

    return (
        <div
            className={classNames(
                'usa-alert',
                'usa-alert--error',
                styles.summary
            )}
            role="alert"
            data-testid="error-summary"
        >
            <div className="usa-alert__body">
                <h3
                    className="usa-alert__heading"
                    tabIndex={-1}
                    ref={headingRef}
                >
                    {summaryHeading(numberOfErrors)}
                </h3>
                <ol>
                    {Object.keys(errors).map((key) => (
                        <li key={key}>
                            <ErrorSummaryMessage
                                errorKey={key}
                                message={flattenMessage(errors[key])}
                            />
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    )
}
