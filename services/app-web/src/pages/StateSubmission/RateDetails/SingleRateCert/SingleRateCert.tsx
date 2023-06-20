import React from 'react'
import {
    Button,
    DatePicker,
    DateRangePicker,
    Fieldset,
    FormGroup,
    Label,
    Link,
} from '@trussworks/react-uswds'
import {
    ActuaryContact,
    RateCapitationType,
    RateType,
} from '../../../../common-code/healthPlanFormDataType'
import {
    FieldRadio,
    FileItemT,
    FileUpload,
    PoliteErrorMessage,
    ProgramSelect,
} from '../../../../components'

import styles from '../../StateSubmissionForm.module.scss'
import { formatUserInputDate, isDateRangeEmpty } from '../../../../formHelpers'
import { useFileUpload } from '../../../../hooks/useFileUpload'
import { ACCEPTED_SUBMISSION_FILE_TYPES } from '../../../../components/FileUpload'
import { useS3 } from '../../../../contexts/S3Context'
import { useStatePrograms } from '../../../../hooks'

import { FormikErrors, getIn, useFormikContext } from 'formik'
import {
    ActuaryCommunicationType,
    SharedRateCertDisplay,
} from '../../../../common-code/healthPlanFormDataType/UnlockedHealthPlanFormDataType'
import { ActuaryContactFields } from '../../Contacts'
import {
    PackagesWithSharedRates,
    PackagesWithSharedRatesProps,
} from '../PackagesWithSharedRates/PackagesWithSharedRates'
import { featureFlags } from '../../../../common-code/featureFlags'
import { useLDClient } from 'launchdarkly-react-client-sdk'

const isRateTypeEmpty = (values: RateCertFormType): boolean =>
    values.rateType === undefined
const isRateTypeAmendment = (values: RateCertFormType): boolean =>
    values.rateType === 'AMENDMENT'

export type RateCertFormType = {
    id?: string
    key: string
    rateType: RateType | undefined
    rateCapitationType: RateCapitationType | undefined
    rateDateStart: string
    rateDateEnd: string
    rateDateCertified: string
    effectiveDateStart: string
    effectiveDateEnd: string
    rateProgramIDs: string[]
    rateDocuments: FileItemT[]
    supportingDocuments: FileItemT[]
    actuaryContacts: ActuaryContact[]
    actuaryCommunicationPreference?: ActuaryCommunicationType
    packagesWithSharedRateCerts: SharedRateCertDisplay[]
    hasSharedRateCert?: 'YES' | 'NO'
}

export type RateInfoArrayType = {
    rateInfos: RateCertFormType[]
}

export type SingleRateFormError =
    FormikErrors<RateInfoArrayType>[keyof FormikErrors<RateInfoArrayType>]

type MultiRatesConfig = {
    reassignNewRateRef: ((el: HTMLInputElement) => void) | undefined
    removeSelf: () => void // callback to Formik FieldArray to imperatively remove this rate from overall list and refocus on add new rate button
}

type SingleRateCertProps = {
    index: number // index of this rate in overall rates list, defaults to 0 if editing standalone rate
    rateInfo: RateCertFormType
    shouldValidate: boolean
    sharedRatesConfig: Pick<PackagesWithSharedRatesProps, 'parentSubmissionID'>
    multiRatesConfig?: MultiRatesConfig // config is present when we are displaying a rate within the multi-rates UI
}

const RateDatesErrorMessage = ({
    startDate,
    endDate,
    startDateError,
    endDateError,
    shouldValidate,
}: {
    shouldValidate: boolean
    startDate?: string
    endDate?: string
    startDateError?: string // yup validation message
    endDateError?: string // yup validation message
}): React.ReactElement => {
    const hasError = shouldValidate && (startDateError || endDateError)

    // Error messages have hierarchy
    // preference to show message for totally empty date, then errors for start date, then for end date
    const validationErrorMessage = hasError
        ? isDateRangeEmpty(startDate, endDate)
            ? 'You must provide a start and an end date'
            : startDateError || endDateError
        : null

    return <PoliteErrorMessage>{validationErrorMessage}</PoliteErrorMessage>
}

export const SingleRateCert = ({
    rateInfo,
    shouldValidate,
    multiRatesConfig,
    index = 0,
    sharedRatesConfig: { parentSubmissionID },
}: SingleRateCertProps): React.ReactElement => {
    console.info('rateInfo', rateInfo)
    const ldClient = useLDClient()
    const showPackagesWithSharedRatesDropdown: boolean = ldClient?.variation(
        featureFlags.PACKAGES_WITH_SHARED_RATES.flag,
        featureFlags.PACKAGES_WITH_SHARED_RATES.defaultValue
    )
    const statePrograms = useStatePrograms()
    const key = rateInfo.key
    const displayAsStandaloneRate = multiRatesConfig === undefined
    const fieldNamePrefix = `rateInfos.${index}`

    const { errors, setFieldValue } = useFormikContext<RateInfoArrayType>()

    const { onFileItemsUpdate } = useFileUpload()
    const { handleDeleteFile, handleUploadFile, handleScanFile } = useS3()

    const showFieldErrors = (
        fieldName: keyof RateCertFormType
    ): string | undefined => {
        if (!shouldValidate) return undefined
        return getIn(errors, `${fieldNamePrefix}.${fieldName}`)
    }

    const handleRateInfoLegend = (index: number) => {
        return displayAsStandaloneRate
            ? `Rate certification`
            : `Rate certification ${index + 1}`
    }

    return (
        <Fieldset
            data-testid={`rate-certification-form`}
            key={key}
            id={`${fieldNamePrefix}.container.${rateInfo.id}`}
            legend={handleRateInfoLegend(index)}
            className={styles.rateCertContainer}
        >
            <FormGroup error={Boolean(showFieldErrors('rateDocuments'))}>
                <FileUpload
                    id={`${fieldNamePrefix}.rateDocuments`}
                    name={`rateInfos.${index}.rateDocuments`}
                    label="Upload rate certification"
                    renderMode="list"
                    aria-required
                    error={showFieldErrors('rateDocuments')}
                    hint={
                        <span className={styles.guidanceTextBlock}>
                            <span className="text-ink">
                                Upload one rate certification only.
                            </span>
                            <span className="text-ink">
                                Additional rates and supporting documents can be
                                added later.
                            </span>
                            <Link
                                aria-label="Document definitions and requirements (opens in new window)"
                                href={'/help#key-documents'}
                                variant="external"
                                target="_blank"
                            >
                                Document definitions and requirements
                            </Link>
                            <span className="padding-top-1">
                                This input only accepts PDF, CSV, DOC, DOCX,
                                XLS, XLSX, XLSM files.
                            </span>
                        </span>
                    }
                    accept={ACCEPTED_SUBMISSION_FILE_TYPES}
                    initialItems={rateInfo.rateDocuments}
                    uploadFile={(file) =>
                        handleUploadFile(file, 'HEALTH_PLAN_DOCS')
                    }
                    scanFile={(key) => handleScanFile(key, 'HEALTH_PLAN_DOCS')}
                    deleteFile={(key) =>
                        handleDeleteFile(key, 'HEALTH_PLAN_DOCS')
                    }
                    onFileItemsUpdate={onFileItemsUpdate}
                    innerInputRef={multiRatesConfig?.reassignNewRateRef}
                />
            </FormGroup>

            {showPackagesWithSharedRatesDropdown && (
                <PackagesWithSharedRates
                    index={index}
                    key={key}
                    fieldNamePrefix={fieldNamePrefix}
                    shouldValidate={shouldValidate}
                    parentSubmissionID={parentSubmissionID}
                />
            )}

            <FormGroup error={Boolean(showFieldErrors('rateProgramIDs'))}>
                <Label htmlFor={`${fieldNamePrefix}.rateProgramIDs`}>
                    Programs this rate certification covers
                </Label>
                <PoliteErrorMessage>
                    {showFieldErrors('rateProgramIDs')}
                </PoliteErrorMessage>
                <ProgramSelect
                    name={`${fieldNamePrefix}.rateProgramIDs`}
                    inputId={`${fieldNamePrefix}.rateProgramIDs`}
                    statePrograms={statePrograms}
                    programIDs={rateInfo.rateProgramIDs}
                    aria-label="programs (required)"
                />
            </FormGroup>

            <FormGroup error={Boolean(showFieldErrors('rateType'))}>
                <Fieldset
                    className={styles.radioGroup}
                    legend="Rate certification type"
                    role="radiogroup"
                    aria-required
                >
                    <PoliteErrorMessage>
                        {showFieldErrors('rateType')}
                    </PoliteErrorMessage>

                    <Link
                        aria-label="Rate certification type definitions (opens in new window)"
                        href={'/help#rate-cert-type-definitions'}
                        variant="external"
                        target="_blank"
                    >
                        Rate certification type definitions
                    </Link>
                    <FieldRadio
                        id={`newRate-${index}`}
                        name={`rateInfos.${index}.rateType`}
                        label="New rate certification"
                        value={'NEW'}
                    />
                    <FieldRadio
                        id={`amendmentRate-${index}`}
                        name={`${fieldNamePrefix}.rateType`}
                        label="Amendment to prior rate certification"
                        value={'AMENDMENT'}
                    />
                </Fieldset>
            </FormGroup>

            <FormGroup error={Boolean(showFieldErrors('rateCapitationType'))}>
                <Fieldset
                    className={styles.radioGroup}
                    legend={
                        <div className={styles.capitationLegend}>
                            <p>
                                Does the actuary certify capitation rates
                                specific to each rate cell or a rate range?
                            </p>
                            <p className={styles.legendSubHeader}>
                                See 42 CFR §§ 438.4(b) and 438.4(c)
                            </p>
                        </div>
                    }
                    role="radiogroup"
                    aria-required
                >
                    <PoliteErrorMessage>
                        {showFieldErrors('rateCapitationType')}
                    </PoliteErrorMessage>
                    <FieldRadio
                        id={`rateCell-${index}`}
                        name={`${fieldNamePrefix}.rateCapitationType`}
                        label="Certification of capitation rates specific to each rate cell"
                        value={'RATE_CELL'}
                    />
                    <FieldRadio
                        id={`rateRange-${index}`}
                        name={`${fieldNamePrefix}.rateCapitationType`}
                        label="Certification of rate ranges of capitation rates per rate cell"
                        value={'RATE_RANGE'}
                    />
                </Fieldset>
            </FormGroup>

            {!isRateTypeEmpty(rateInfo) && (
                <>
                    <FormGroup
                        error={Boolean(
                            showFieldErrors('rateDateStart') ||
                                showFieldErrors('rateDateEnd')
                        )}
                    >
                        <Fieldset
                            aria-required
                            legend={
                                isRateTypeAmendment(rateInfo)
                                    ? 'Rating period of original rate certification'
                                    : 'Rating period'
                            }
                        >
                            <RateDatesErrorMessage
                                startDate={rateInfo.rateDateStart}
                                endDate={rateInfo.rateDateEnd}
                                startDateError={showFieldErrors(
                                    'rateDateStart'
                                )}
                                endDateError={showFieldErrors('rateDateEnd')}
                                shouldValidate={shouldValidate}
                            />

                            <DateRangePicker
                                className={styles.dateRangePicker}
                                startDateHint="mm/dd/yyyy"
                                startDateLabel="Start date"
                                startDatePickerProps={{
                                    disabled: false,
                                    id: `${fieldNamePrefix}.rateDateStart`,
                                    name: `${fieldNamePrefix}.rateDateStart`,
                                    'aria-required': true,
                                    defaultValue: rateInfo.rateDateStart,
                                    onChange: (val) =>
                                        setFieldValue(
                                            `${fieldNamePrefix}.rateDateStart`,
                                            formatUserInputDate(val)
                                        ),
                                }}
                                endDateHint="mm/dd/yyyy"
                                endDateLabel="End date"
                                endDatePickerProps={{
                                    disabled: false,
                                    id: `${fieldNamePrefix}.rateDateEnd`,
                                    name: `${fieldNamePrefix}.rateDateEnd`,
                                    'aria-required': true,
                                    defaultValue: rateInfo.rateDateEnd,
                                    onChange: (val) =>
                                        setFieldValue(
                                            `${fieldNamePrefix}.rateDateEnd`,
                                            formatUserInputDate(val)
                                        ),
                                }}
                            />
                        </Fieldset>
                    </FormGroup>

                    {isRateTypeAmendment(rateInfo) && (
                        <>
                            <FormGroup
                                error={Boolean(
                                    showFieldErrors('effectiveDateStart') ||
                                        showFieldErrors('effectiveDateEnd')
                                )}
                            >
                                <Fieldset
                                    aria-required
                                    legend="Effective dates of rate amendment"
                                >
                                    <RateDatesErrorMessage
                                        startDate={rateInfo.effectiveDateStart}
                                        endDate={rateInfo.effectiveDateEnd}
                                        startDateError={showFieldErrors(
                                            'effectiveDateStart'
                                        )}
                                        endDateError={showFieldErrors(
                                            'effectiveDateEnd'
                                        )}
                                        shouldValidate={shouldValidate}
                                    />

                                    <DateRangePicker
                                        className={styles.dateRangePicker}
                                        startDateHint="mm/dd/yyyy"
                                        startDateLabel="Start date"
                                        startDatePickerProps={{
                                            disabled: false,
                                            id: `${fieldNamePrefix}.effectiveDateStart`,
                                            name: `${fieldNamePrefix}.effectiveDateStart`,
                                            'aria-required': true,
                                            defaultValue:
                                                rateInfo.effectiveDateStart,
                                            onChange: (val) =>
                                                setFieldValue(
                                                    `${fieldNamePrefix}.effectiveDateStart`,
                                                    formatUserInputDate(val)
                                                ),
                                        }}
                                        endDateHint="mm/dd/yyyy"
                                        endDateLabel="End date"
                                        endDatePickerProps={{
                                            disabled: false,
                                            id: `${fieldNamePrefix}.effectiveDateEnd`,
                                            name: `${fieldNamePrefix}.effectiveDateEnd`,
                                            'aria-required': true,
                                            defaultValue:
                                                rateInfo.effectiveDateEnd,
                                            onChange: (val) =>
                                                setFieldValue(
                                                    `${fieldNamePrefix}.effectiveDateEnd`,
                                                    formatUserInputDate(val)
                                                ),
                                        }}
                                    />
                                </Fieldset>
                            </FormGroup>
                        </>
                    )}
                    <FormGroup
                        error={Boolean(showFieldErrors('rateDateCertified'))}
                    >
                        <Label
                            htmlFor={`${fieldNamePrefix}.rateDateCertified`}
                            id={`rateDateCertifiedLabel.${index}`}
                        >
                            {isRateTypeAmendment(rateInfo)
                                ? 'Date certified for rate amendment'
                                : 'Date certified'}
                        </Label>
                        <div
                            className="usa-hint"
                            id={`rateDateCertifiedHint.${index}`}
                        >
                            mm/dd/yyyy
                        </div>
                        <PoliteErrorMessage>
                            {showFieldErrors('rateDateCertified')}
                        </PoliteErrorMessage>

                        <DatePicker
                            aria-required
                            aria-describedby={`rateDateCertifiedLabel.${index} rateDateCertifiedHint.${index}`}
                            id={`${fieldNamePrefix}.rateDateCertified`}
                            name={`${fieldNamePrefix}.rateDateCertified`}
                            defaultValue={rateInfo.rateDateCertified}
                            onChange={(val) =>
                                setFieldValue(
                                    `${fieldNamePrefix}.rateDateCertified`,
                                    formatUserInputDate(val)
                                )
                            }
                        />
                    </FormGroup>
                </>
            )}

            <FormGroup>
                <ActuaryContactFields
                    actuaryContact={rateInfo.actuaryContacts[0]}
                    errors={errors}
                    shouldValidate={shouldValidate}
                    fieldNamePrefix={`${fieldNamePrefix}.actuaryContacts.0`}
                    fieldSetLegend="Certifying Actuary"
                />
            </FormGroup>
            {index >= 1 && multiRatesConfig && (
                <Button
                    type="button"
                    unstyled
                    className={styles.removeContactBtn}
                    onClick={async () => {
                        await onFileItemsUpdate({ fileItems: [] })
                        multiRatesConfig.removeSelf()
                    }}
                >
                    Remove rate certification
                </Button>
            )}
        </Fieldset>
    )
}
