import classNames from 'classnames'
import classnames from 'classnames'
import React, { useEffect, useRef } from 'react'
import styles from './ErrorSummary.module.scss'

type ErrorSummaryMessageProps = {
    errorKey: string,
    message: string
}
const ErrorSummaryMessage = ({
    errorKey, message
}: ErrorSummaryMessageProps): React.ReactElement => {
    return (
        <a
            href={"#" + errorKey}
            className={classnames(styles.message)}
            data-testid="error-summary-message"
            onClick={() => {
                const fieldElement: HTMLElement | null = document.querySelector(
                    `[name="${errorKey}"]`
                );
            
                if (fieldElement) {
                    fieldElement.focus();
                }
            }}
        >
        {message}
      </a> 
    ) 
}

function summaryHeading(numberOfErrors: number) {
    if (numberOfErrors === 1) {
        return "There is 1 error on this page";
    } else {
        return `There are ${numberOfErrors} errors on this page`;
    }
}

function flattenMessage(message: string | string[]) {
    if (typeof message === "string") {
        return message;
    }

    return message.join(" and ");
}

export type ErrorSummaryProps = {
    errors: { [field: string]: string | string[] }
}

/**
 * This component renders a list of validation errors.
 * 
 * Each message will render a button that will focus the relevant field
 * when it is clicked.
 *
 * This component relies on the errors object returned by Formik, so it should generally
 * rendered inside of a Formik form context.
 */
export const ErrorSummary = ({
    errors
}: ErrorSummaryProps): React.ReactElement | null => {
    const numberOfErrors = Object.keys(errors).length;

    const headingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        if (numberOfErrors > 0) {
            const { current } = headingRef;
            if (current) {
                current.focus();
            }
        }
      }, [numberOfErrors]);
      
    if (numberOfErrors === 0) {
        return null;
    }

    return (
        <div className={classNames("usa-alert", "usa-alert--error", styles.summary)} role="alert" data-testid="error-summary">
            <div className="usa-alert__body">
                <h3 className="usa-alert__heading" tabIndex={-1} ref={headingRef}>{summaryHeading(numberOfErrors)}</h3>
                <ol>
                    {Object.keys(errors).map((key) => <li key={key}><ErrorSummaryMessage errorKey={key} message={flattenMessage(errors[key])} /></li>)}
                </ol>
            </div>
        </div>
    )
}