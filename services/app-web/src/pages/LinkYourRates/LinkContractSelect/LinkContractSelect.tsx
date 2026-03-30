import {
    ActionMeta,
    AriaOnFocus,
    Props,
    FormatOptionLabelMeta,
    SingleValue,
} from 'react-select'
import styles from '../../../components/Select/Select.module.scss'
import {
    IndexContractsStrippedInput,
    useIndexContractsStrippedQuery,
} from '../../../gen/gqlClient'
import { programNames, SubmissionTypeRecord } from '@mc-review/submissions'
import { formatCalendarDate } from '@mc-review/dates'
import { AccessibleSelect } from '../../../components/Select'
import { useTealium } from '../../../hooks'
import { useField } from 'formik'

export interface LinkContractOptionType {
    readonly value: string
    readonly label: string
    readonly isFixed?: boolean
    readonly isDisabled?: boolean
    readonly contractName: string
    readonly programIDs: string
    readonly contractDateStart: string
    readonly contractDateEnd: string
    readonly submissionType: string
}

export type LinkContractSelectPropType = {
    name: string
    initialValue: string | undefined
    alreadySelected?: string[]
    label?: string
    stateCode?: string
}

export const LinkContractSelect = ({
    name,
    initialValue,
    alreadySelected,
    label,
    stateCode,
    ...selectProps
}: LinkContractSelectPropType & Props<LinkContractOptionType, false>) => {
    const input: IndexContractsStrippedInput = { stateCode }
    const { data, loading, error } = useIndexContractsStrippedQuery({
        variables: { input },
    })
    const { logDropdownSelectionEvent } = useTealium()
    const [_field, _meta, helpers] = useField({ name })

    const contracts =
        data?.indexContractsStripped.edges.map((e) => e.node) || []
    const updatedContracts = contracts
        .sort(
            (a, b) =>
                new Date(
                    b.latestSubmittedRevision?.submitInfo?.updatedAt ??
                        b.updatedAt
                ).getTime() -
                new Date(
                    a.latestSubmittedRevision?.submitInfo?.updatedAt ??
                        a.updatedAt
                ).getTime()
        )
        .filter((contract) => contract.consolidatedStatus !== 'WITHDRAWN')

    const contractOptions: LinkContractOptionType[] = updatedContracts
        .map((contract) => {
            const revision =
                contract.latestSubmittedRevision ?? contract.draftRevision

            if (!revision) {
                return undefined
            }

            return {
                value: contract.id,
                label: revision.contractName,
                contractName: revision.contractName,
                programIDs: programNames(
                    contract.state.programs,
                    revision.formData.programIDs
                ).join(', '),
                contractDateStart: revision.formData.contractDateStart
                    ? formatCalendarDate(
                          revision.formData.contractDateStart,
                          'UTC'
                      )
                    : 'N/A',
                contractDateEnd: revision.formData.contractDateEnd
                    ? formatCalendarDate(
                          revision.formData.contractDateEnd,
                          'UTC'
                      )
                    : 'N/A',
                submissionType:
                    SubmissionTypeRecord[revision.formData.submissionType],
            }
        })
        .filter(
            (option): option is LinkContractOptionType => option !== undefined
        )

    const onFocus: AriaOnFocus<LinkContractOptionType> = ({
        focused,
        isDisabled,
    }): string => {
        return `You are currently focused on option ${focused.label}${
            isDisabled ? ', disabled' : ''
        }`
    }

    const defaultValue: LinkContractOptionType | undefined =
        contractOptions.find(
            (contractOption) => contractOption.value === initialValue
        )

    const noOptionsMessage = () => {
        if (loading) {
            return 'Loading contracts...'
        }
        if (error) {
            return 'Could not load contracts. Please refresh your browser.'
        }

        return 'No contracts found'
    }

    const onInputChange = async (
        newValue: SingleValue<LinkContractOptionType>,
        { action }: ActionMeta<LinkContractOptionType>
    ) => {
        if (action === 'select-option' && newValue) {
            logDropdownSelectionEvent({
                text: newValue.label,
                heading: label,
            })
            await helpers.setValue(newValue.value)
        } else if (action === 'clear') {
            logDropdownSelectionEvent({
                text: 'clear',
                heading: label,
            })
            await helpers.setValue('')
        }
    }

    const formatOptionLabel = (
        data: LinkContractOptionType,
        optionMeta: FormatOptionLabelMeta<LinkContractOptionType>
    ) => {
        if (optionMeta.context === 'menu') {
            return (
                <>
                    <strong>{data.contractName}</strong>
                    <div style={{ lineHeight: '50%' }}>
                        <p>Programs: {data.programIDs}</p>
                        <p>
                            Contract period: {data.contractDateStart}-
                            {data.contractDateEnd}
                        </p>
                        <p>Submission type: {data.submissionType}</p>
                    </div>
                </>
            )
        }

        return <div>{data.contractName}</div>
    }

    return (
        <AccessibleSelect
            value={defaultValue}
            className={styles.rateMultiSelect}
            options={
                error || loading
                    ? undefined
                    : alreadySelected
                      ? contractOptions.filter(
                            (contract) =>
                                !alreadySelected.includes(contract.value)
                        )
                      : contractOptions
            }
            formatOptionLabel={formatOptionLabel}
            isSearchable
            maxMenuHeight={400}
            aria-label="linked contract"
            ariaLiveMessages={{
                onFocus,
            }}
            isClearable
            noOptionsMessage={() => noOptionsMessage()}
            classNamePrefix="select"
            id={`${name}-parentDiv`}
            placeholder={loading ? 'Loading contracts...' : 'Select...'}
            loadingMessage={() => 'Loading contracts...'}
            name={name}
            inputId={name}
            onChange={onInputChange}
            {...selectProps}
        />
    )
}
