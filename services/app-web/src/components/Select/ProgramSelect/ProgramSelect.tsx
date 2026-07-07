import React from 'react'
import styles from '../Select.module.scss'
import {
    ActionMeta,
    AriaOnFocus,
    components,
    MultiValueRemoveProps,
    OnChangeValue,
    Props,
} from 'react-select'
import { useField } from 'formik'
import { useStatePrograms, useTealium } from '../../../hooks'
import { AccessibleSelect } from '../AccessibleSelect/AccessibleSelect'
import {
    formattedProgramName,
    getAvailableContractPrograms,
} from '../../../formHelpers'
import { Program } from '../../../gen/gqlClient'

export type ProgramSelectPropType = {
    name: string
    programIDs: string[]
    contractProgramsOnly?: boolean
    label?: string
} & Props<ProgramOptionType, true>

export interface ProgramOptionType {
    readonly value: string
    readonly label: string
    readonly formattedLabel: React.ReactNode
    readonly isFixed?: boolean
    readonly isDisabled?: boolean
}

/**
 * React-select's default MultiValueRemove builds its aria-label as
 * `Remove ${children}`, where `children` is the rendered label. Because we
 * use `formatOptionLabel` to return a React element, the default stringifies
 * to "Remove [object Object]". Override it to use the plain-string `label`.
 */
const MultiValueRemove = (
    props: MultiValueRemoveProps<ProgramOptionType, true>
) => (
    <components.MultiValueRemove
        {...props}
        innerProps={{
            ...props.innerProps,
            'aria-label': `Remove ${props.data.label}`,
        }}
    />
)

/**
 * `label` is the plain-string name react-select uses for accessibility
 * (aria-label on the remove button, aria-live focus announcements, screen
 * reader status) and its built-in text filter. It must stay a string or
 * those paths break. `formattedLabel` is the visual-only React node passed
 * to `formatOptionLabel`, letting us italicize the "(retired)" suffix
 * without touching the string that assistive tech consumes.
 */
const toProgramOption = (program: Program): ProgramOptionType => ({
    value: program.id,
    label: program.isDeprecated ? `${program.name} (retired)` : program.name,
    formattedLabel: formattedProgramName(program),
})

/**
 * This component renders the react-select combobox
 *
 * It relies on the Formik useField hook to work, so it must ALWAYS be rendered
 * inside a Formik form context.
 */
export const ProgramSelect = ({
    name,
    programIDs,
    contractProgramsOnly,
    label,
    ...selectProps
}: ProgramSelectPropType) => {
    const [_field, _meta, helpers] = useField({ name })
    const allPrograms = useStatePrograms()
    const statePrograms = contractProgramsOnly
        ? getAvailableContractPrograms(allPrograms, programIDs)
        : allPrograms

    const programOptions: ProgramOptionType[] =
        statePrograms.map(toProgramOption)

    const { logDropdownSelectionEvent } = useTealium()

    const onFocus: AriaOnFocus<ProgramOptionType> = ({
        focused,
        isDisabled,
    }): string => {
        return `You are currently focused on option ${focused.label}${
            isDisabled ? ', disabled' : ''
        }`
    }

    const handleOnChangeWithLogging = async (
        newValue: OnChangeValue<ProgramOptionType, true>,
        actionMeta: ActionMeta<ProgramOptionType>
    ) => {
        const action = actionMeta.action
        // This is done because we are handling the values outside react-select onChange function
        if (action === 'select-option' && actionMeta.option?.value) {
            logDropdownSelectionEvent({
                text: actionMeta.option.value,
                heading: label,
            })
        } else if (action === 'remove-value') {
            logDropdownSelectionEvent({
                text: `${action}: ${actionMeta.removedValue?.value}`,
                heading: label,
            })
        } else if (action) {
            logDropdownSelectionEvent({
                text: action,
                heading: label,
            })
        }

        await helpers.setValue(
            newValue.map((item: { value: string }) => item.value)
        )
    }

    return (
        <AccessibleSelect
            defaultValue={programIDs.map((programID) => {
                const program = statePrograms.find((p) => p.id === programID)
                if (!program) {
                    return {
                        value: programID,
                        label: 'Unknown Program',
                        formattedLabel: 'Unknown Program',
                    }
                }
                return toProgramOption(program)
            })}
            className={styles.multiSelect}
            classNamePrefix="select"
            id={`${name}-programSelect`}
            name={name}
            options={programOptions}
            formatOptionLabel={(option) => option.formattedLabel}
            components={{ MultiValueRemove }}
            isMulti
            ariaLiveMessages={{
                onFocus,
            }}
            onChange={handleOnChangeWithLogging}
            {...selectProps}
        />
    )
}
