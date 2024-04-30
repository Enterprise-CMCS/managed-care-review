import { formatCalendarDate } from '../../../../common-code/dateHelpers'
import {
    DataDetail,
    DataDetailMissingField,
    DoubleColumnGrid,
    SectionCard,
    UploadedDocumentsTable,
} from '../../../../components'
import { FormikRateForm } from './RateDetailsV2'
import { useStatePrograms } from '../../../../hooks'
import { formatDocumentsForGQL } from '../../../../formHelpers/formatters'

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
                <DoubleColumnGrid>
                    <DataDetail
                        id="submissionDate"
                        label="Submission date"
                        children={formatCalendarDate(
                            rateForm.initiallySubmittedAt
                        )}
                    />

                    <DataDetail
                        id="ratePrograms"
                        label="Programs this rate certification covers"
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
                            rateForm.rateDateStart && rateForm.rateDateEnd ? (
                                `${formatCalendarDate(
                                    rateForm?.rateDateStart
                                )} to ${formatCalendarDate(
                                    rateForm?.rateDateEnd
                                )}`
                            ) : (
                                <DataDetailMissingField />
                            )
                        }
                    />
                </DoubleColumnGrid>
            </dl>
            <UploadedDocumentsTable
                documents={formatDocumentsForGQL(rateForm.rateDocuments)}
                multipleDocumentsAllowed={false}
                caption="Rate certification"
                documentCategory="Rate certification"
                hideDynamicFeedback={true} // linked rates always displayed without validations
                previousSubmissionDate={null}
            />
        </SectionCard>
    )
}
