import { formatCalendarDate } from '@mc-review/dates'
import {
    DataDetail,
    MultiColumnGrid,
    SectionCard,
    UploadedDocumentsTable,
} from '../../../components'
import type { FormikRateForm } from './'
import { useStatePrograms } from '../../../hooks'
import { formatDocumentsForGQL } from '../../../formHelpers/formatters'

export const LinkedRateSummary = ({
    rateForm,
}: {
    rateForm: FormikRateForm
}): React.ReactElement | null => {
    const statePrograms = useStatePrograms()

    return (
        <SectionCard id={`linked-rate-${rateForm.id}`} key={rateForm.id}>
            <h3 aria-label={`Rate ID: ${rateForm.rateCertificationName}`}>
                {rateForm.rateCertificationName}
            </h3>
            <dl>
                <MultiColumnGrid columns={2}>
                    <DataDetail
                        id="submissionDate"
                        label="Submission date"
                        children={formatCalendarDate(
                            rateForm.initiallySubmittedAt,
                            'America/Los_Angeles'
                        )}
                    />

                    <DataDetail
                        id="ratePrograms"
                        label="Rates this rate certification covers"
                        children={statePrograms
                            .filter((p) =>
                                rateForm.rateProgramIDs.includes(p.id)
                            )
                            .map((p) => p.name)}
                    />
                    <DataDetail
                        id="ratingPeriod"
                        label="Rating period"
                        children={
                            rateForm.rateDateStart &&
                            rateForm.rateDateEnd &&
                            `${formatCalendarDate(
                                rateForm?.rateDateStart,
                                'UTC'
                            )} to ${formatCalendarDate(rateForm?.rateDateEnd, 'UTC')}`
                        }
                    />
                </MultiColumnGrid>
            </dl>
            <UploadedDocumentsTable
                documents={formatDocumentsForGQL(rateForm.rateDocuments)}
                multipleDocumentsAllowed={false}
                caption="Rate certification"
                documentCategory="Rate certification"
                hideDynamicFeedback={true} // linked rates always displayed without validations
                previousSubmissionDate={null}
                isLinkedRate
            />
        </SectionCard>
    )
}
