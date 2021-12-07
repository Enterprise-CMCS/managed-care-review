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
        <button
            type="button"
            className={classnames("usa-error-message", "usa-alert__text", styles.message)}
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
      </button> 
    ) 
}

function summaryHeading(numberOfErrors: number) {
    if (numberOfErrors === 1) {
        return "There is 1 error on this page";
    } else {
        return `There are ${numberOfErrors} errors on this page`;
    }
}

export type ErrorSummaryProps = {
    errors: { [field: string]: string }
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
        if (numberOfErrors === 0) {
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
        <div className={classNames("usa-alert", "usa-alert--error", styles.summary)} role="alert">
            <div className="usa-alert__body">
                <h3 className="usa-alert__heading" tabIndex={-1} ref={headingRef}>{summaryHeading(numberOfErrors)}</h3>
                <ol>
                    {Object.keys(errors).map((key) => <li><ErrorSummaryMessage key={key} errorKey={key} message={errors[key]} /></li>)}
                </ol>
            </div>
        </div>
    )
}