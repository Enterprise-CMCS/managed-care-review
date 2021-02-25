import React from 'react'

import { Alert } from '@trussworks/react-uswds'

export const Error400 = (): React.ReactElement => {
    return (
        <Alert
            data-testId="Error400"
            style={{ width: '600px', marginBottom: '5px' }}
            type="error"
            heading="Oops! Something went wrong"
        />
    )
}
