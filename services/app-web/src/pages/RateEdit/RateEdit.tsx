import React from 'react'
import { RateFormDataInput } from '../../gen/gqlClient'

import { RateDetails } from '../StateSubmission/RateDetails'
import { RouteT } from '../../constants'

export type SubmitRateHandler = (
    rateID: string,
    formInput: RateFormDataInput,
    setIsSubmitting: (isSubmitting: boolean) => void,
    redirect: RouteT
) => void

export const RateEdit = (): React.ReactElement => {
    return (
        <div data-testid="single-rate-edit">
            <RateDetails type="SINGLE" />
        </div>
    )
}
