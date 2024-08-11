import React from 'react'
import Select, {
    ActionMeta,
    AriaOnFocus,
    Props,
    FormatOptionLabelMeta,
    SingleValue,
    createFilter,
} from 'react-select'
import styles from '../../../components/Select/Select.module.scss'
import { IndexRatesInput, useIndexRatesQuery } from '../../../gen/gqlClient'
import { programNames, StateCodeType } from '../../../common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../../common-code/dateHelpers'
import {
    FormikRateForm,
    convertGQLRateToRateForm,
} from '../../StateSubmission/RateDetails'
import { useS3 } from '../../../contexts/S3Context'
import { useTealium } from '../../../hooks'
import { useField } from 'formik'

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
    label?: string,
    stateCode?: StateCodeType//used to limit rates by state
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
    const input: IndexRatesInput  = {stateCode}
    const { data, loading, error } =  useIndexRatesQuery({variables: { input }})

    const { getKey } = useS3()
    const { logDropdownSelectionEvent } = useTealium()
    const [ _field, _meta, helpers] = useField({ name }) // useField only relevant for non-autofill implementations

    const rates = data?.indexRates.edges.map((e) => e.node) || []

    // Sort rates by latest submission in desc order and remove withdrawn
    rates.sort(
        (a, b) =>
            new Date(b.revisions[0].submitInfo?.updatedAt).getTime() -
            new Date(a.revisions[0].submitInfo?.updatedAt).getTime()
    ).filter( (rate)=> rate.withdrawInfo === undefined)

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

    const onInputChange = async (
        newValue: SingleValue<LinkRateOptionType>,
        { action }: ActionMeta<LinkRateOptionType>
    ) => {
        if (action === 'select-option' && newValue) {
            logDropdownSelectionEvent({
                text: newValue.label,
                heading: label,
            })

            if(autofill) {
                const linkedRateID = newValue.value
                const linkedRate = rates.find((rate) => rate.id === linkedRateID)
                const linkedRateForm: FormikRateForm = convertGQLRateToRateForm(
                    getKey,
                    linkedRate
                )
                // put already selected fields back in place
                linkedRateForm.ratePreviouslySubmitted = 'YES'

                autofill(linkedRateForm)
            } else {
                // this path is used for replace/withdraw redundant rates
                // we are not autofilling form data, we are just returning the IDs of the rate selectred
                await helpers.setValue(
                    newValue.value)
            }
        } else if (action === 'clear') {
            logDropdownSelectionEvent({
                text: 'clear',
                heading: label,
            })
            if(autofill){
                const emptyRateForm = convertGQLRateToRateForm(getKey)
                // put already selected fields back in place
                emptyRateForm.ratePreviouslySubmitted = 'YES'
                autofill(emptyRateForm)
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
        <Select
            value={defaultValue}
            className={styles.rateMultiSelect}
            options={
                error || loading
                    ? undefined
                    : alreadySelected?
                    rateNames.filter(
                          (rate) =>  !alreadySelected.includes(rate.value)
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
