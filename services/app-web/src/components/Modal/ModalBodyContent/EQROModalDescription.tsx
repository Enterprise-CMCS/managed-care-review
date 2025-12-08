import React from 'react'

export const EQROModalDescription = () => {
    return (
        <>
            <p>
                When you click submit, our system will decide if CMS will review
                your submission. The decision is based on the information you
                provide on this form.
            </p>
            <p style={{ marginBottom: 0 }}>
                {' '}
                We will send an email with the following information:
            </p>
            <ul style={{ marginTop: 0 }}>
                <li>
                    <b>Confirmation of receipt</b>: Confirms that CMS has
                    received your submission.
                </li>
                <li>
                    <b>Review decision</b>: Whether CMS will review your
                    submission.
                </li>
                <li>
                    <b>What comes next</b>: What to expect based on the review
                    decision
                </li>
            </ul>
        </>
    )
}
