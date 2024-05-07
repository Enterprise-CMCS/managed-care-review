import React from 'react'
import Select, { ActionMeta, AriaOnFocus, Props } from 'react-select'
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
    readonly label: React.ReactElement
    readonly isFixed?: boolean
    readonly isDisabled?: boolean
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
}: LinkRateSelectPropType & Props<LinkRateOptionType, true>) => {
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
            label: (
                <>
                    <strong>{revision.formData.rateCertificationName}</strong>
                    <div style={{ lineHeight: '50%', fontSize: '14px' }}>
                        <p>
                            Programs:&nbsp;
                            {programNames(
                                statePrograms,
                                revision.formData.rateProgramIDs
                            ).join(', ')}
                        </p>
                        <p>
                            Rating period:&nbsp;
                            {formatCalendarDate(
                                revision.formData.rateDateStart
                            )}
                            -{formatCalendarDate(revision.formData.rateDateEnd)}
                        </p>
                        <p>
                            Certification date:&nbsp;
                            {formatCalendarDate(
                                revision.formData.rateDateCertified
                            )}
                        </p>
                    </div>
                </>
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
        newValue: LinkRateOptionType,
        { action }: ActionMeta<LinkRateOptionType>
    ) => {
        if (action === 'select-option') {
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

    //Need this to make the label searchable since the rate name is buried in a react element
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filterOptions = ({ label }: any, input: string) =>
        label.props.children[0].props.children
            ?.toLowerCase()
            .includes(input.toLowerCase())

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
            filterOption={filterOptions}
            {...selectProps}
            inputId={name}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={onInputChange as any} // TODO see why the types definitions are messed up for react-select "single" (not multi) onChange - may need to upgrade dep if this bug was fixed
        />
    )
}
