import React from 'react'
import styles from '../Select.module.scss'
import Select, { AriaOnFocus, Props } from 'react-select'
import { Program } from '../../../gen/gqlClient'

export type PackageSelectPropType = {
    name: string
    statePrograms: Program[]
    initialValues: string[]
    packageOptions: PackageOptionType[]
    draftSubmissionId: string
    error?: boolean | undefined
}

type PackageOptionType = {
    readonly label: string
    readonly value: string
    readonly isFixed?: boolean
    readonly isDisabled?: boolean
}

export const PackageSelect = ({
    name,
    statePrograms,
    initialValues,
    packageOptions,
    draftSubmissionId,
    error,
    ...selectProps
}: PackageSelectPropType & Props<PackageOptionType, true>) => {
    const { isLoading } = selectProps

    const onFocus: AriaOnFocus<PackageOptionType> = ({
        focused,
        isDisabled,
    }): string => {
        return `You are currently focused on option ${focused.label}${
            isDisabled ? ', disabled' : ''
        }`
    }

    const defaultValues =
        initialValues.length && packageOptions.length
            ? initialValues.map((pkg) => {
                  const name = packageOptions?.find(
                      (options) => options.value === pkg
                  )?.label
                  if (!name) {
                      return {
                          value: pkg,
                          label: 'Unknown submission',
                      }
                  }
                  return {
                      label: name,
                      value: pkg,
                  }
              })
            : []

    const noOptionsMessage = () => {
        if (isLoading) {
            return 'Loading submissions...'
        }
        if (error) {
            return 'Could not load submissions. Please refresh your browser.'
        }
        if (!packageOptions.length) {
            return 'No submissions found'
        }
        return
    }

    return (
        <Select
            defaultValue={defaultValues}
            placeholder={isLoading ? 'Loading submissions...' : 'Select...'}
            noOptionsMessage={() => noOptionsMessage()}
            loadingMessage={() => 'Loading submissions...'}
            className={styles.multiSelect}
            classNamePrefix="select"
            id={`${name}-packageSelect`}
            name={name}
            options={error || isLoading ? undefined : packageOptions}
            isSearchable
            isMulti
            aria-label="submission (required)"
            ariaLiveMessages={{
                onFocus,
            }}
            {...selectProps}
        />
    )
}
