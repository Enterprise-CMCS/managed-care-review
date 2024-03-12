import React from 'react'
import Select, { AriaOnFocus, Props } from 'react-select'
import styles from '../../components/Select/Select.module.scss'
import { StateUser, useIndexRatesQuery } from '../../gen/gqlClient'
import { useField } from 'formik'
import { useAuth } from '../../contexts/AuthContext'
import { programNames } from '../../common-code/healthPlanFormDataType'
import { formatCalendarDate } from '../../common-code/dateHelpers'

export interface LinkRateOptionType {
    readonly value: string
    readonly label: React.ReactElement
    readonly isFixed?: boolean
    readonly isDisabled?: boolean
}

export type LinkRateSelectPropType = {
    name: string
    initialValues: string[]
}

export const LinkRateSelect = ({
    name,
    initialValues,
    ...selectProps
}: LinkRateSelectPropType & Props<LinkRateOptionType, true>) => {
    const [_field, _meta, helpers] = useField({ name })
    const { data, loading, error } = useIndexRatesQuery()
    const { loggedInUser } = useAuth()
    const user = loggedInUser as StateUser
    const statePrograms = user.state.programs

    const rateNames: LinkRateOptionType[] = []
    data?.indexRates.edges
        .map((edge) => edge.node)
        .forEach((rate) => {
            if (rate.revisions.length > 0) {
                rate.revisions.forEach((revision) => {
                    if (revision.formData.rateCertificationName) {
                        rateNames.push({
                            value: revision.id,
                            label: (
                                <div style={{ lineHeight: '50%' }}>
                                    <h4>
                                        {
                                            revision.formData
                                                .rateCertificationName
                                        }
                                    </h4>
                                    <p>
                                        Programs:{' '}
                                        {programNames(
                                            statePrograms,
                                            revision.formData.rateProgramIDs
                                        ).join(', ')}
                                    </p>
                                    <p>
                                        Rating period:{' '}
                                        {formatCalendarDate(
                                            revision.formData.rateDateStart
                                        )}{' '}
                                        -{' '}
                                        {formatCalendarDate(
                                            revision.formData.rateDateEnd
                                        )}
                                    </p>
                                    <p>
                                        Certification date:{' '}
                                        {formatCalendarDate(
                                            revision.formData.rateDateCertified
                                        )}
                                    </p>
                                </div>
                            ),
                        })
                    }
                })
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

    const defaultValues =
        initialValues.length && rateNames.length
            ? initialValues.map((rateId) => {
                  const rateName = rateNames.find(
                      (names) => names.value === rateId
                  )?.label.props.children[0].props.children

                  if (!rateName) {
                      return {
                          value: rateId,
                          label: 'Unknown rate',
                      }
                  }

                  return {
                      value: rateId,
                      label: rateName,
                  }
              })
            : []

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

    return (
        <>
            <Select
                value={defaultValues}
                className={styles.multiSelect}
                options={error || loading ? undefined : rateNames}
                isSearchable
                isMulti
                maxMenuHeight={169}
                aria-label="linked rates (required)"
                ariaLiveMessages={{
                    onFocus,
                }}
                noOptionsMessage={() => noOptionsMessage()}
                classNamePrefix="select"
                id={`${name}-linkRateSelect`}
                inputId=""
                placeholder={
                    loading ? 'Loading rate certifications...' : 'Select...'
                }
                loadingMessage={() => 'Loading rate certifications...'}
                name={name}
                onChange={(selectedOptions) =>
                    helpers.setValue(
                        selectedOptions.map(
                            (item: { value: string }) => item.value
                        )
                    )
                }
                {...selectProps}
            />
        </>
    )
}
