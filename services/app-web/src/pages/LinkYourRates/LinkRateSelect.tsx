import React from 'react'
import Select, {
    ActionMeta,
    AriaOnFocus,
    Props,
    FormatOptionLabelMeta,
    SingleValue,
    createFilter,
} from 'react-select'
import styles from '../../components/Select/RateSelect/RateSelect.module.scss'
import { StateUser, useIndexRatesQuery } from '../../gen/gqlClient'
import { useAuth } from '../../contexts/AuthContext'
import { programNames } from '../../common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../common-code/dateHelpers'
import {
    FormikRateForm,
    RateDetailFormConfig,
} from '../StateSubmission/RateDetails/V2/RateDetailsV2'
import { convertGQLRateToRateForm } from '../StateSubmission/RateDetails/V2/rateDetailsHelpers'
import { useS3 } from '../../contexts/S3Context'
import { useFormikContext } from 'formik'

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
    autofill: (rateForm: FormikRateForm) => void // used for multi-rates, when called will FieldArray replace the existing form fields with new data
}

export const LinkRateSelect = ({
    name,
    initialValue,
    autofill,
    ...selectProps
}: LinkRateSelectPropType & Props<LinkRateOptionType, false>) => {
    const { values }: { values: RateDetailFormConfig } = useFormikContext()
    const { data, loading, error } = useIndexRatesQuery()
    const { getKey } = useS3()
    const { loggedInUser } = useAuth()
    const user = loggedInUser as StateUser
    const statePrograms = user.state.programs

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
                statePrograms,
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

            autofill(linkedRateForm)
        } else if (action === 'clear') {
            const emptyRateForm = convertGQLRateToRateForm(getKey)

            // put already selected fields back in place
            emptyRateForm.ratePreviouslySubmitted = 'YES'

            autofill(emptyRateForm)
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

    //We track rates that have already been selected to remove them from the dropdown
    const selectedRates = values.rateForms.map((rate) => rate.id && rate.id)

    return (
        <Select
            value={defaultValue}
            className={styles.rateMultiSelect}
            options={
                error || loading
                    ? undefined
                    : rateNames.filter(
                          (rate) => !selectedRates.includes(rate.value)
                      )
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
