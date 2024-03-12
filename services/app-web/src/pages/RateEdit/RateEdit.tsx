import React from 'react'
import { RateFormDataInput } from '../../gen/gqlClient'

import { RateDetailsV2 } from '../StateSubmission/RateDetails/V2/RateDetailsV2'
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
            <RateDetailsV2 type="SINGLE" />
        </div>
    )
}
