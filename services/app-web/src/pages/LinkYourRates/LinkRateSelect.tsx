import React from 'react'
import Select, {
    ActionMeta,
    AriaOnFocus,
    Props,
    FormatOptionLabelMeta,
    SingleValue,
    createFilter,
} from 'react-select'
import styles from '../../components/Select/Select.module.scss'
import { useIndexRatesQuery } from '../../gen/gqlClient'
import { programNames } from '../../common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../common-code/dateHelpers'
import {
    FormikRateForm,
    convertGQLRateToRateForm,
} from '../StateSubmission/RateDetails'
import { useS3 } from '../../contexts/S3Context'
import { useTealium } from '../../hooks'

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
    alreadySelected?: string[], // used for multi-rate, array of rate IDs helps ensure we can't select rates already selected elsewhere on page
    autofill?: (rateForm: FormikRateForm) => void // used for multi-rates, when called will FieldArray replace the existing form fields with new data
    label?: string
}

export const LinkRateSelect = ({
    name,
    initialValue,
    autofill,
    alreadySelected,
    label,
    ...selectProps
}: LinkRateSelectPropType & Props<LinkRateOptionType, false>) => {
    const { data, loading, error } = useIndexRatesQuery()
    const { getKey } = useS3()
    const { logDropdownSelectionEvent } = useTealium()

    const rates = data?.indexRates.edges.map((e) => e.node) || []

    // Sort rates by latest submission in desc order
    rates.sort(
        (a, b) =>
            new Date(b.revisions[0].submitInfo?.updatedAt).getTime() -
            new Date(a.revisions[0].submitInfo?.updatedAt).getTime()
    )

    const rateNames: LinkRateOptionType[] = rates.map((rate) => {
        const revision = rate.revisions[0]
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
                revision.formData.rateProgramIDs
            ).join(', '),
            rateDateStart: formatCalendarDate(revision.formData.rateDateStart),
            rateDateEnd: formatCalendarDate(revision.formData.rateDateEnd),
            rateDateCertified: formatCalendarDate(
                revision.formData.rateDateCertified
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
        }
        if (!data) {
            return 'No rate certifications found'
        }
    }

    const onInputChange = (
        newValue: SingleValue<LinkRateOptionType>,
        { action }: ActionMeta<LinkRateOptionType>
    ) => {
        if (action === 'select-option' && newValue) {
            const linkedRateID = newValue.value
            const linkedRate = rates.find((rate) => rate.id === linkedRateID)
            const linkedRateForm: FormikRateForm = convertGQLRateToRateForm(
                getKey,
                linkedRate
            )
            // put already selected fields back in place
            linkedRateForm.ratePreviouslySubmitted = 'YES'

            logDropdownSelectionEvent({
                text: newValue.label,
                heading: label,
            })
            if(autofill) autofill(linkedRateForm)
        } else if (action === 'clear') {
            const emptyRateForm = convertGQLRateToRateForm(getKey)

            // put already selected fields back in place
            emptyRateForm.ratePreviouslySubmitted = 'YES'

            logDropdownSelectionEvent({
                text: 'clear',
                heading: label,
            })
            if(autofill)  autofill(emptyRateForm)
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
        <Select
            value={defaultValue}
            className={styles.rateMultiSelect}
            options={
                error || loading
                    ? undefined
                    : alreadySelected?
                    rateNames.filter(
                          (rate) =>  alreadySelected.includes(rate.value)
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
