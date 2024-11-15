import React from 'react'
import { divisionFullNames } from '../QuestionResponseHelpers'
import { Division } from '../../../gen/gqlClient'

export const QAUploadFormSummary = ({
    isContract,
    division,
    round
}: {
    isContract: boolean
    division: Division
    round?: number
}): React.ReactElement | null => {

    return (
        <div id='formSummary'>
        <span className="text-bold">{isContract? 'Contract questions' : 'Rate questions'}</span>
        <span>{`Asked by: ${divisionFullNames[division]}`}</span>
        {round && <span>{`Round ${round}`}</span>}
        </div>
    )
}
