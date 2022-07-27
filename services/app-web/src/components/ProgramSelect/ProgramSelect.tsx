import React from 'react'
import styles from './ProgramSelect.module.scss'
import Select, { AriaOnFocus, MultiValue, ActionMeta } from 'react-select'
import { Program } from '../../gen/gqlClient'

export type ProgramSelectPropType = {
    statePrograms: Program[]
    programIDs: string[]
    onChange: (
        newValue: MultiValue<ProgramOption>,
        actionMeta: ActionMeta<ProgramOption>
    ) => string[] | []
}

interface ProgramOption {
    readonly value: string
    readonly label: string
    readonly isFixed?: boolean
    readonly isDisabled?: boolean
}

export const ProgramSelect = ({
    statePrograms,
    programIDs,
    onChange,
}: ProgramSelectPropType) => {
    const programOptions: Array<{ value: string; label: string }> =
        statePrograms.map((program) => {
            return { value: program.id, label: program.name }
        })

    const onFocus: AriaOnFocus<ProgramOption> = ({
        focused,
        isDisabled,
    }): string => {
        return `You are currently focused on option ${focused.label}${
            isDisabled ? ', disabled' : ''
        }`
    }

    return (
        <Select
            defaultValue={programIDs.map((programID) => {
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
            })}
            className={styles.multiSelect}
            classNamePrefix="program-select"
            id="programIDs"
            name="programIDs"
            aria-label="programs (required)"
            options={programOptions}
            isMulti
            onChange={onChange}
            ariaLiveMessages={{
                onFocus,
            }}
        />
    )
}
