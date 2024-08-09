import React from 'react'
import styles from '../Select.module.scss'
import Select, {
    ActionMeta,
    AriaOnFocus,
    OnChangeValue,
    Props,
} from 'react-select'
import { useField } from 'formik'
import { useStatePrograms, useTealium } from '../../../hooks'

export type ProgramSelectPropType = {
    name: string
    programIDs: string[]
    contractProgramsOnly?: boolean
    label?: string
}

export interface ProgramOptionType {
    readonly value: string
    readonly label: string
    readonly isFixed?: boolean
    readonly isDisabled?: boolean
}

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
}: ProgramSelectPropType & Props<ProgramOptionType, true>) => {
    const [_field, _meta, helpers] = useField({ name })
    const allPrograms = useStatePrograms()
    const statePrograms = contractProgramsOnly
        ? allPrograms.filter((program) => !program.isRateProgram)
        : allPrograms

    const programOptions: ProgramOptionType[] = statePrograms.map((program) => {
        return { value: program.id, label: program.name }
    })

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

    const programValue = programIDs.map((programID) => {
        const program = statePrograms.find((p) => p.id === programID)
        if (!program) {
            return {
                value: programID,
                label: 'Unknown Program',
            }
        }
        return {
            value: program.id,
            label: program.name,
        }
    })

    return (
        <Select
            defaultValue={programValue}
            value={contractProgramsOnly ? programValue : undefined}
            className={styles.multiSelect}
            classNamePrefix="select"
            id={`${name}-programSelect`}
            name={name}
            options={programOptions}
            isMulti
            ariaLiveMessages={{
                onFocus,
            }}
            onChange={handleOnChangeWithLogging}
            {...selectProps}
        />
    )
}
