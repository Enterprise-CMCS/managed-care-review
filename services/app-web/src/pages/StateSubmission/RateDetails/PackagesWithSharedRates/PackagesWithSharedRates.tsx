import React from 'react'

import { useIndexHealthPlanPackagesQuery } from '../../../../gen/gqlClient'
import { recordJSException } from '../../../../otelHelpers'
import { dayjs } from '../../../../common-code/dateHelpers'
import { getCurrentRevisionFromHealthPlanPackage } from '../../../../gqlHelpers'
import type { PackageOptionType } from '../../../../components/Select'
import { useStatePrograms } from '../../../../hooks'
import { packageName } from '../../../../common-code/healthPlanFormDataType'
import { FieldYesNo, PoliteErrorMessage } from '../../../../components'
import { FormGroup, Label, Link } from '@trussworks/react-uswds'
import { PackageSelect } from '../../../../components/Select'
import { getIn, useFormikContext } from 'formik'
import {
    RateCertFormType,
    RateInfoArrayType,
} from '../SingleRateCert/SingleRateCert'

import styles from '../../StateSubmissionForm.module.scss'
import { RoutesRecord } from '../../../../constants'

export type PackagesWithSharedRatesProps = {
    index: number
    keyProp: string
    shouldValidate: boolean
    fieldNamePrefix: string
    parentSubmissionID: string
}

export const PackagesWithSharedRates = ({
    index,
    keyProp,
    shouldValidate,
    parentSubmissionID,
    fieldNamePrefix,
}: PackagesWithSharedRatesProps): React.ReactElement | null => {
    const statePrograms = useStatePrograms()
    const [packageOptions, setPackageOptions] = React.useState<
        PackageOptionType[]
    >([])

    const showFieldErrors = (
        fieldName: keyof RateCertFormType
    ): string | undefined => {
        if (!shouldValidate) return undefined
        return getIn(errors, `${fieldNamePrefix}.${fieldName}`)
    }

    // Grab values and submitForm from context
    const { values, errors, setFieldValue } =
        useFormikContext<RateInfoArrayType>()

    const { loading, error } = useIndexHealthPlanPackagesQuery({
        onCompleted: async (data) => {
            const packagesWithUpdatedAt: Array<
                { updatedAt: Date } & PackageOptionType
            > = []
            data?.indexHealthPlanPackages.edges
                .map((edge) => edge.node)
                .forEach((sub) => {
                    const currentRevisionPackageOrError =
                        getCurrentRevisionFromHealthPlanPackage(sub)
                    if (currentRevisionPackageOrError instanceof Error) {
                        recordJSException(
                            `indexHealthPlanPackagesQuery: Error decoding proto. ID: ${sub.id}`
                        )
                        return null // TODO make an error state for PackageSelect, right now we just remove from page if this request fails
                    }
                    const [currentRevision, currentSubmissionData] =
                        currentRevisionPackageOrError

                    // Exclude active submission and contract_only submissions from list.
                    if (
                        currentSubmissionData.id !== parentSubmissionID &&
                        currentSubmissionData.submissionType ===
                            'CONTRACT_AND_RATES'
                    ) {
                        const submittedAt = currentRevision.submitInfo
                            ?.updatedAt
                            ? ` (Submitted ${dayjs(
                                  currentRevision.submitInfo.updatedAt
                              )
                                  .tz('UTC')
                                  .format('MM/DD/YY')})`
                            : ` (Draft)`

                        packagesWithUpdatedAt.push({
                            updatedAt: currentSubmissionData.updatedAt,
                            label: `${packageName(
                                currentSubmissionData,
                                statePrograms
                            )}${submittedAt}`,
                            value: currentSubmissionData.id,
                        })
                    }
                })

            const packagesList = packagesWithUpdatedAt.sort((a, b) =>
                a['updatedAt'] > b['updatedAt'] ? -1 : 1
            )
            setPackageOptions(packagesList)
        },
        onError: (error) => {
            recordJSException(
                `indexHealthPlanPackagesQuery: Error querying health plan packages. ID: ${parentSubmissionID} Error message: ${error.message}`
            )
            return null
        },
    })

    return (
        <FormGroup
            error={Boolean(
                showFieldErrors('hasSharedRateCert') &&
                    showFieldErrors('packagesWithSharedRateCerts')
            )}
        >
            <FieldYesNo
                className={styles.radioGroup}
                id={`hasSharedRateCert.${index}.hasSharedRateCert`}
                name={`${fieldNamePrefix}.hasSharedRateCert`}
                label="Was this rate certification uploaded to any other submissions?"
                showError={Boolean(showFieldErrors('hasSharedRateCert'))}
                aria-required
            />

            {getIn(values, `${fieldNamePrefix}.hasSharedRateCert`) ===
                'YES' && (
                <>
                    <Label
                        htmlFor={`${fieldNamePrefix}.packagesWithSharedRateCerts`}
                    >
                        Please select the submissions that also contain this
                        rate certification.
                    </Label>
                    <span className={styles.requiredOptionalText}>
                        Required
                    </span>
                    <Link
                        aria-label="View all submissions (opens in new window)"
                        href={RoutesRecord.DASHBOARD_SUBMISSIONS}
                        variant="external"
                        target="_blank"
                    >
                        View all submissions
                    </Link>
                    <PoliteErrorMessage>
                        {shouldValidate &&
                            getIn(
                                errors,
                                `${fieldNamePrefix}.packagesWithSharedRateCerts`
                            )}
                    </PoliteErrorMessage>

                    <PackageSelect
                        //This key is required here because the combination of react-select, defaultValue, formik and apollo useQuery
                        // causes issues with the default value when reloading the page
                        key={`packageOptions-${keyProp}`}
                        inputId={`${fieldNamePrefix}.packagesWithSharedRateCerts`}
                        name={`${fieldNamePrefix}.packagesWithSharedRateCerts`}
                        statePrograms={statePrograms}
                        initialValues={getIn(
                            values,
                            `${fieldNamePrefix}.packagesWithSharedRateCerts`
                        ).map(
                            (item: {
                                packageId: string
                                packageName: string
                            }) => (item.packageId ? item.packageId : '')
                        )}
                        packageOptions={packageOptions}
                        draftSubmissionId={parentSubmissionID}
                        isLoading={loading}
                        error={error instanceof Error}
                        onChange={(selectedOptions) =>
                            setFieldValue(
                                `${fieldNamePrefix}.packagesWithSharedRateCerts`,
                                selectedOptions.map(
                                    (item: PackageOptionType) => {
                                        return {
                                            packageName: item.label.replace(
                                                /\s\(.*?\)/g,
                                                ''
                                            ),
                                            packageId: item.value,
                                        }
                                    }
                                )
                            )
                        }
                    />
                </>
            )}
        </FormGroup>
    )
}
