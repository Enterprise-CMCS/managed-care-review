import {
    ActionMeta,
    AriaOnFocus,
    Props,
    FormatOptionLabelMeta,
    SingleValue,
    createFilter,
} from 'react-select'
import styles from '../../../components/Select/Select.module.scss'
import { IndexRatesInput, useIndexRatesQuery, useIndexRatesStrippedQuery } from '../../../gen/gqlClient'
import { programNames } from '@mc-review/hpp'
import { formatCalendarDate } from '@mc-review/dates'
import {
    FormikRateForm,
    convertGQLRateToRateForm,
} from '../../StateSubmission/RateDetails'
import { useS3 } from '../../../contexts/S3Context'
import { useTealium } from '../../../hooks'
import { useField } from 'formik'
import { convertIndexRatesGQLRateToRateForm } from '../../StateSubmission/RateDetails/rateDetailsHelpers'
import { AccessibleSelect } from '../../../components/Select'

export interface LinkRateOptionType {
    readonly value: string
    readonly label: string
    readonly isFixed?: boolean
    readonly isDisabled?: boolean
    readonly rateCertificationName: string
    readonly rateProgramIDs: string
    readonly rateDateStart: string
    readonly rateDateEnd: string
    readonly rateDateCertified: string
}

export type LinkRateSelectPropType = {
    name: string
    initialValue: string | undefined
    alreadySelected?: string[] // used for multi-rate, array of rate IDs helps ensure we can't select rates already selected elsewhere on page
    autofill?: (rateForm: FormikRateForm, linkedRateID?: string) => void // used for multi-rates, when called will FieldArray replace the existing form fields with new data
    label?: string
    stateCode?: string //used to limit rates by state
}

export const LinkRateSelect = ({
    name,
    initialValue,
    autofill,
    alreadySelected,
    label,
    stateCode,
    ...selectProps
}: LinkRateSelectPropType & Props<LinkRateOptionType, false>) => {
    const input: IndexRatesInput = { stateCode }
    const { data, loading, error } = useIndexRatesQuery({
        variables: { input },
    })
    const { data: rData, loading: rLoading, error: rError } = useIndexRatesStrippedQuery({
        variables: { input },
    })
    const { getKey } = useS3()
    const { logDropdownSelectionEvent } = useTealium()
    const [_field, _meta, helpers] = useField({ name }) // useField only relevant for non-autofill implementations

    const rates = rData?.indexRatesStripped.edges.map((e) => e.node) || []
    // const rates = data?.indexRates.edges.map((e) => e.node) || []
    // Sort rates by latest submission in desc order and remove withdrawn
    // Do not display withdrawn rates as an option of a linked rate to select
    const updatedRates = rates
        .sort(
            (a, b) =>
                new Date(b.latestSubmittedRevision.submitInfo?.updatedAt).getTime() -
                new Date(a.latestSubmittedRevision.submitInfo?.updatedAt).getTime()
        )
        .filter((rate) => rate.consolidatedStatus !== 'WITHDRAWN')

    const rateNames: LinkRateOptionType[] = updatedRates.map((rate) => {
        const revision = rate.latestSubmittedRevision
        const rateProgramIDs =
            revision.formData.rateProgramIDs.length > 0
                ? revision.formData.rateProgramIDs
                : revision.formData.deprecatedRateProgramIDs

        return {
            value: rate.id,
            label:
                revision.formData.rateCertificationName ??
                'Unknown rate certification',
            rateCertificationName:
                revision.formData.rateCertificationName ??
                'Unknown rate certification',
            rateProgramIDs: programNames(
                rate.state.programs,
                rateProgramIDs
            ).join(', '),
            rateDateStart: formatCalendarDate(
                revision.formData.rateDateStart,
                'UTC'
            ),
            rateDateEnd: formatCalendarDate(
                revision.formData.rateDateEnd,
                'UTC'
            ),
            rateDateCertified: formatCalendarDate(
                revision.formData.rateDateCertified,
                'UTC'
            ),
        }
    })

    const onFocus: AriaOnFocus<LinkRateOptionType> = ({
        focused,
        isDisabled,
    }): string => {
        return `You are currently focused on option ${focused.label}${
            isDisabled ? ', disabled' : ''
        }`
    }

    const defaultValue: LinkRateOptionType | undefined = rateNames.find(
        (rateOption) => rateOption.value === initialValue
    )

    const noOptionsMessage = () => {
        if (loading) {
            return 'Loading rate certifications...'
        }
        if (error) {
            return 'Could not load rate certifications. Please refresh your browser.'
        } else {
            return 'No rate certifications found'
        }
    }

    const onInputChange = async (
        newValue: SingleValue<LinkRateOptionType>,
        { action }: ActionMeta<LinkRateOptionType>
    ) => {
        if (action === 'select-option' && newValue) {
            logDropdownSelectionEvent({
                text: newValue.label,
                heading: label,
            })

            if (autofill) {
                const linkedRateID = newValue.value
                const linkedRate = rates.find(
                    (rate) => rate.id === linkedRateID
                )
                // const linkedRateForm: FormikRateForm =
                //     convertIndexRatesGQLRateToRateForm(getKey, linkedRate)
                // // put already selected fields back in place
                // linkedRateForm.ratePreviouslySubmitted = 'YES'

                // autofill(linkedRateForm, linkedRateID)
            } else {
                // this path is used for replace/withdraw redundant rates
                // we are not autofilling form data, we are just returning the IDs of the rate selected
                await helpers.setValue(newValue.value)
            }
        } else if (action === 'clear') {
            logDropdownSelectionEvent({
                text: 'clear',
                heading: label,
            })
            if (autofill) {
                const emptyRateForm = convertGQLRateToRateForm(getKey)
                // put already selected fields back in place
                emptyRateForm.ratePreviouslySubmitted = 'YES'
                autofill(emptyRateForm)
            } else {
                // this path is used for replace/withdraw redundant rates
                // we are not autofilling form data, we are just returning the IDs of the rate selected
                await helpers.setValue('')
            }
        }
    }

    const formatOptionLabel = (
        data: LinkRateOptionType,
        optionMeta: FormatOptionLabelMeta<LinkRateOptionType>
    ) => {
        if (optionMeta.context === 'menu') {
            return (
                <>
                    <strong>{data.rateCertificationName}</strong>
                    <div style={{ lineHeight: '50%' }}>
                        <p>Programs: {data.rateProgramIDs}</p>
                        <p>
                            Rating period: {data.rateDateStart}-
                            {data.rateDateEnd}
                        </p>
                        <p>Certification date: {data.rateDateCertified}</p>
                    </div>
                </>
            )
        }
        return <div>{data.rateCertificationName}</div>
    }

    return (
        <AccessibleSelect
            value={defaultValue}
            className={styles.rateMultiSelect}
            options={
                error || loading
                    ? undefined
                    : alreadySelected
                      ? rateNames.filter(
                            (rate) => !alreadySelected.includes(rate.value)
                        )
                      : rateNames
            }
            formatOptionLabel={formatOptionLabel}
            isSearchable
            maxMenuHeight={400}
            aria-label="linked rate (required)"
            ariaLiveMessages={{
                onFocus,
            }}
            isClearable
            noOptionsMessage={() => noOptionsMessage()}
            classNamePrefix="select"
            id={`${name}-parentDiv`}
            placeholder={
                loading ? 'Loading rate certifications...' : 'Select...'
            }
            loadingMessage={() => 'Loading rate certifications...'}
            name={name}
            filterOption={createFilter({
                ignoreCase: true,
                trim: true,
                matchFrom: 'any' as const,
            })}
            {...selectProps}
            inputId={name}
            onChange={onInputChange}
        />
    )
}
