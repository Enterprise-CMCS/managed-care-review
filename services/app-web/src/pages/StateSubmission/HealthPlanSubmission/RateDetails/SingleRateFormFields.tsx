import React, { useEffect, useState, useRef } from 'react'
import { DatePicker, Fieldset, FormGroup, Label } from '@trussworks/react-uswds'
import { CustomDateRangePicker } from '../../../../components/Form/CustomDateRangePicker/CustomDateRangePicker'
import classnames from 'classnames'
import {
    ButtonWithLogging,
    FieldRadio,
    FieldCheckbox,
    FileUpload,
    LinkWithLogging,
    PoliteErrorMessage,
    ProgramSelect,
} from '../../../../components'

import styles from '../../StateSubmissionForm.module.scss'
import { dayjs, formatUserInputDate } from '@mc-review/dates'
import {
    ACCEPTED_RATE_SUPPORTING_DOCS_FILE_TYPES,
    ACCEPTED_RATE_CERTIFICATION_FILE_TYPES,
} from '../../../../components/FileUpload'
import { useS3 } from '../../../../contexts/S3Context'

import {
    FieldArray,
    FieldArrayRenderProps,
    FormikErrors,
    getIn,
    useFormikContext,
} from 'formik'
import { ActuaryContactFields } from '../../SharedContactsPage'
import { FormikRateForm, RateDetailFormConfig } from './RateDetails'
import { useFocus } from '../../../../hooks'
import { ContactSupportLink } from '../../../../components/ErrorAlert/ContactSupportLink'
import { Contract } from '../../../../gen/gqlClient'
import { featureFlags } from '@mc-review/common-code'
import { useLDClient } from 'launchdarkly-react-client-sdk'

const isRateTypeEmpty = (rateForm: FormikRateForm): boolean =>
    rateForm.rateType === undefined
const isRateTypeAmendment = (rateForm: FormikRateForm): boolean =>
    rateForm.rateType === 'AMENDMENT'

/**
 * This component renders rate certification related form fields with their labels and error messages
 *
 * It relies on useFormikContext hook to work inside of a Formik form with matching field name values
 */

export type SingleRateFormError =
    FormikErrors<RateDetailFormConfig>[keyof FormikErrors<RateDetailFormConfig>]

type SingleRateFormFieldsProps = {
    rateForm: FormikRateForm
    shouldValidate: boolean
    index: number // defaults to 0
    fieldNamePrefix: string // formik field name prefix - used for looking up values and errors in Formik FieldArray
    contract?: Contract
    autofill?: (rateForm: FormikRateForm) => void // used for multi-rates, when called will FieldArray replace the existing form fields with new data
}

const emptyActuaryContact = {
    name: '',
    titleRole: '',
    email: '',
    actuarialFirm: undefined,
    actuarialFirmOther: '',
}

export const SingleRateFormFields = ({
    rateForm,
    shouldValidate,
    index = 0,
    fieldNamePrefix,
    contract,
}: SingleRateFormFieldsProps): React.ReactElement => {
    // page level setup
    const { handleUploadFile, handleScanFile } = useS3()
    const { errors, setFieldValue } = useFormikContext<RateDetailFormConfig>()
    const [focusNewActuaryContact, setFocusNewActuaryContact] = useState(false)
    const ldClient = useLDClient()

    const newActuaryContactNameRef = useRef<HTMLInputElement | null>(null)
    const [newActuaryContactButtonRef, setNewActuaryContactButtonFocus] =
        useFocus()

    const dsnpEnabled = ldClient?.variation(
        featureFlags.DSNP.flag,
        featureFlags.DSNP.defaultValue
    )

    useEffect(() => {
        if (focusNewActuaryContact) {
            if (newActuaryContactNameRef.current) {
                newActuaryContactNameRef.current.focus()
            }
            setFocusNewActuaryContact(false)
            newActuaryContactNameRef.current = null
        }
    }, [focusNewActuaryContact])

    const showFieldErrors = (
        fieldName: keyof FormikRateForm
    ): string | undefined => {
        if (!shouldValidate) return undefined
        return getIn(errors, `${fieldNamePrefix}.${fieldName}`)
    }

    const formHeading = 'Rate Details Form'
    const isDSNP = contract?.draftRevision?.formData.dsnpContract === true
    return (
        <>
            <FormGroup error={Boolean(showFieldErrors('rateDocuments'))}>
                <FileUpload
                    id={`${fieldNamePrefix}.rateDocuments`}
                    name={`${fieldNamePrefix}.rateDocuments`}
                    label="Upload one rate certification document"
                    aria-required
                    allowMultipleUploads={false}
                    error={showFieldErrors('rateDocuments')}
                    hint={
                        <span className={styles.guidanceTextBlockNoPadding}>
                            <LinkWithLogging
                                aria-label="Document definitions and requirements (opens in new window)"
                                href={'/help#key-documents'}
                                variant="external"
                                target="_blank"
                            >
                                Document definitions and requirements
                            </LinkWithLogging>
                            <span className="mcr-note padding-top-2">
                                {`Upload only one rate certification document. Additional rates can be added later.`}
                            </span>

                            <span className="usa-hint padding-top-1">
                                This input only accepts one file in PDF, DOC, or
                                DOCX format.
                            </span>
                        </span>
                    }
                    accept={ACCEPTED_RATE_CERTIFICATION_FILE_TYPES}
                    initialItems={rateForm.rateDocuments}
                    uploadFile={(file) =>
                        handleUploadFile(file, 'HEALTH_PLAN_DOCS')
                    }
                    scanFile={(key) => handleScanFile(key, 'HEALTH_PLAN_DOCS')}
                    onFileItemsUpdate={({ fileItems }) =>
                        setFieldValue(
                            `${fieldNamePrefix}.rateDocuments`,
                            fileItems
                        )
                    }
                />
            </FormGroup>

            <FormGroup error={Boolean(showFieldErrors('supportingDocuments'))}>
                <FileUpload
                    id={`${fieldNamePrefix}.supportingDocuments`}
                    name={`${fieldNamePrefix}.supportingDocuments`}
                    label="Upload supporting documents"
                    aria-required={false}
                    error={showFieldErrors('supportingDocuments')}
                    hint={
                        <span className={styles.guidanceTextBlockNoPadding}>
                            <LinkWithLogging
                                aria-label="Document definitions and requirements (opens in new window)"
                                href={'/help#key-documents'}
                                variant="external"
                                target="_blank"
                            >
                                Document definitions and requirements
                            </LinkWithLogging>
                            <span className="mcr-note padding-top-1">
                                {`Upload any supporting documents for Rate certification ${index + 1}`}
                            </span>
                            <span>Additional rates can be added later.</span>

                            <span className="usa-hint padding-top-1">
                                This input only accepts PDF, CSV, DOC, DOCX,
                                XLS, XLSX files.
                            </span>
                        </span>
                    }
                    accept={ACCEPTED_RATE_SUPPORTING_DOCS_FILE_TYPES}
                    initialItems={rateForm.supportingDocuments}
                    uploadFile={(file) =>
                        handleUploadFile(file, 'HEALTH_PLAN_DOCS')
                    }
                    scanFile={(key) => handleScanFile(key, 'HEALTH_PLAN_DOCS')}
                    onFileItemsUpdate={({ fileItems }) =>
                        setFieldValue(
                            `${fieldNamePrefix}.supportingDocuments`,
                            fileItems
                        )
                    }
                />
            </FormGroup>
            <FormGroup error={Boolean(showFieldErrors('rateProgramIDs'))}>
                <Label htmlFor={`${fieldNamePrefix}.rateProgramIDs`}>
                    What rates are included in this certification?
                </Label>
                <div role="note">
                    <span className={styles.requiredOptionalText}>
                        Required
                    </span>
                    <span className="mcr-note">
                        This information will be used to generate the rate name
                    </span>
                    <ContactSupportLink
                        alternateText="Contact the Help Desk to edit this list"
                        variant="external"
                    />
                </div>
                <PoliteErrorMessage formFieldLabel="What rates are included in this certification?">
                    {showFieldErrors('rateProgramIDs')}
                </PoliteErrorMessage>
                <ProgramSelect
                    name={`${fieldNamePrefix}.rateProgramIDs`}
                    inputId={`${fieldNamePrefix}.rateProgramIDs`}
                    programIDs={rateForm.rateProgramIDs}
                    aria-label={'programs (required)'}
                    label="What rates are included in this certification?"
                />
            </FormGroup>

            {dsnpEnabled && isDSNP && (
                <FormGroup
                    error={Boolean(showFieldErrors('rateMedicaidPopulations'))}
                >
                    <Fieldset
                        legend="Which Medicaid populations are included in this rate certification?"
                        aria-required
                        id={`${fieldNamePrefix}.rateMedicaidPopulations`}
                    >
                        <span className={styles.requiredOptionalText}>
                            Required
                        </span>
                        <div
                            role="note"
                            aria-labelledby={`${fieldNamePrefix}.rateMedicaidPopulations`}
                            className="mcr-note margin-top-1"
                        >
                            See 42 CFR § 422.2
                        </div>
                        <LinkWithLogging
                            aria-label="Medicaid Managed Care Rate Development Guide (opens in new window)"
                            href={
                                'https://www.medicaid.gov/medicaid/managed-care/guidance/rate-review-and-rate-guides'
                            }
                            variant="external"
                            target="_blank"
                        >
                            Medicaid Managed Care Rate Development Guide
                        </LinkWithLogging>
                        <div className="usa-hint">
                            <span>Check all that apply</span>
                        </div>
                        {Boolean(
                            showFieldErrors('rateMedicaidPopulations')
                        ) && (
                            <PoliteErrorMessage formFieldLabel="Which Medicaid populations are included in this rate certification">
                                {showFieldErrors('rateMedicaidPopulations')}
                            </PoliteErrorMessage>
                        )}
                        <FieldCheckbox
                            id={`${fieldNamePrefix}.withDSNP`}
                            name={`${fieldNamePrefix}.rateMedicaidPopulations`}
                            label="Medicare-Medicaid dually eligible individuals enrolled through a Dual-Eligible Special Needs Plan (D-SNP)"
                            value="MEDICARE_MEDICAID_WITH_DSNP"
                            heading="Which Medicaid populations are included in this rate certification"
                            parent_component_heading={formHeading}
                        />
                        <FieldCheckbox
                            id={`${fieldNamePrefix}.medicaidOnly`}
                            name={`${fieldNamePrefix}.rateMedicaidPopulations`}
                            label="Medicaid-only"
                            value="MEDICAID_ONLY"
                            heading="Which Medicaid populations are included in this rate certification"
                            parent_component_heading={formHeading}
                        />
                        <FieldCheckbox
                            id={`${fieldNamePrefix}.withoutDSNP`}
                            name={`${fieldNamePrefix}.rateMedicaidPopulations`}
                            label={
                                <span>
                                    Medicare-Medicaid dually eligible
                                    individuals{' '}
                                    <span style={{ fontWeight: 600 }}>not</span>{' '}
                                    enrolled through a D-SNP
                                </span>
                            }
                            value="MEDICARE_MEDICAID_WITHOUT_DSNP"
                            heading="Which Medicaid populations are included in this rate certification"
                            parent_component_heading={formHeading}
                        />
                    </Fieldset>
                </FormGroup>
            )}

            <FormGroup error={Boolean(showFieldErrors('rateType'))}>
                <Fieldset
                    className={styles.radioGroup}
                    legend="Rate certification type"
                    role="radiogroup"
                    aria-required
                >
                    <span className={styles.requiredOptionalText}>
                        Required
                    </span>
                    <PoliteErrorMessage formFieldLabel="Rate certification type">
                        {showFieldErrors('rateType')}
                    </PoliteErrorMessage>

                    <LinkWithLogging
                        aria-label="Rate certification type definitions (opens in new window)"
                        href={'/help#rate-cert-type-definitions'}
                        variant="external"
                        target="_blank"
                    >
                        Rate certification type definitions
                    </LinkWithLogging>
                    <FieldRadio
                        id={`newRate-${index}`}
                        name={`${fieldNamePrefix}.rateType`}
                        label="New rate certification"
                        value={'NEW'}
                        list_position={1}
                        list_options={2}
                        parent_component_heading="Rate certification type"
                        radio_button_title="New rate certification"
                    />
                    <FieldRadio
                        id={`amendmentRate-${index}`}
                        name={`${fieldNamePrefix}.rateType`}
                        label="Amendment to prior rate certification"
                        value={'AMENDMENT'}
                        list_position={2}
                        list_options={2}
                        parent_component_heading="Rate certification type"
                        radio_button_title="Amendment to prior rate certification"
                    />
                </Fieldset>
            </FormGroup>

            <FormGroup error={Boolean(showFieldErrors('rateCapitationType'))}>
                <Fieldset
                    className={styles.radioGroup}
                    legend={
                        <div className={styles.capitationLegend}>
                            <p className="margin-bottom-0">
                                Does the actuary certify capitation rates
                                specific to each rate cell or a rate range?
                            </p>
                            <span
                                className={classnames(
                                    styles.legendSubHeader,
                                    styles.requiredOptionalText
                                )}
                            >
                                Required
                            </span>
                            <p
                                className={classnames(
                                    'margin-bottom-0',
                                    styles.legendSubHeader
                                )}
                            >
                                See 42 CFR §§ 438.4(b) and 438.4(c)
                            </p>
                        </div>
                    }
                    role="radiogroup"
                    aria-required
                >
                    <PoliteErrorMessage formFieldLabel="Does the actuary certify capitation rates specific to each rate cell or a rate range?">
                        {showFieldErrors('rateCapitationType')}
                    </PoliteErrorMessage>
                    <FieldRadio
                        id={`rateCell-${index}`}
                        name={`${fieldNamePrefix}.rateCapitationType`}
                        label="Certification of capitation rates specific to each rate cell"
                        value={'RATE_CELL'}
                        list_position={1}
                        list_options={2}
                        parent_component_heading="Does the actuary certify capitation rates specific to each rate cell or a rate range?"
                        radio_button_title="Certification of capitation rates specific to each rate cell"
                    />
                    <FieldRadio
                        id={`rateRange-${index}`}
                        name={`${fieldNamePrefix}.rateCapitationType`}
                        label="Certification of rate ranges of capitation rates per rate cell"
                        value={'RATE_RANGE'}
                        list_position={2}
                        list_options={2}
                        parent_component_heading="Does the actuary certify capitation rates specific to each rate cell or a rate range?"
                        radio_button_title="Certification of rate ranges of capitation rates per rate cell"
                    />
                </Fieldset>
            </FormGroup>

            {!isRateTypeEmpty(rateForm) && (
                <>
                    <FormGroup
                        error={Boolean(
                            showFieldErrors('rateDateStart') ??
                                showFieldErrors('rateDateEnd')
                        )}
                    >
                        <Fieldset
                            aria-required
                            legend={
                                isRateTypeAmendment(rateForm)
                                    ? 'Rating period of original rate certification'
                                    : 'Rating period'
                            }
                        >
                            <span className={styles.requiredOptionalText}>
                                Required
                            </span>

                            <CustomDateRangePicker
                                className={styles.dateRangePicker}
                                startDateHint="mm/dd/yyyy"
                                startDateLabel="Start date"
                                startDateError={showFieldErrors(
                                    'rateDateStart'
                                )}
                                startDatePickerProps={{
                                    disabled: false,
                                    id: `${fieldNamePrefix}.rateDateStart`,
                                    name: `${fieldNamePrefix}.rateDateStart`,
                                    'aria-required': true,
                                    defaultValue: rateForm.rateDateStart,
                                    onChange: (val) =>
                                        setFieldValue(
                                            `${fieldNamePrefix}.rateDateStart`,
                                            formatUserInputDate(val)
                                        ),
                                }}
                                endDateHint="mm/dd/yyyy"
                                endDateLabel="End date"
                                endDateError={showFieldErrors('rateDateEnd')}
                                endDatePickerProps={{
                                    disabled: false,
                                    id: `${fieldNamePrefix}.rateDateEnd`,
                                    name: `${fieldNamePrefix}.rateDateEnd`,
                                    'aria-required': true,
                                    defaultValue: rateForm.rateDateEnd,
                                    onChange: (val) =>
                                        setFieldValue(
                                            `${fieldNamePrefix}.rateDateEnd`,
                                            formatUserInputDate(val)
                                        ),
                                }}
                            />
                        </Fieldset>
                    </FormGroup>

                    {isRateTypeAmendment(rateForm) && (
                        <>
                            <FormGroup
                                error={Boolean(
                                    showFieldErrors('effectiveDateStart') ??
                                        showFieldErrors('effectiveDateEnd')
                                )}
                            >
                                <Fieldset
                                    aria-required
                                    legend="Effective dates of rate amendment"
                                >
                                    <span
                                        className={styles.requiredOptionalText}
                                    >
                                        Required
                                    </span>

                                    <CustomDateRangePicker
                                        className={styles.dateRangePicker}
                                        startDateHint="mm/dd/yyyy"
                                        startDateLabel="Start date"
                                        startDateError={showFieldErrors(
                                            'effectiveDateStart'
                                        )}
                                        startDatePickerProps={{
                                            disabled: false,
                                            id: `${fieldNamePrefix}.effectiveDateStart`,
                                            name: `${fieldNamePrefix}.effectiveDateStart`,
                                            'aria-required': true,
                                            defaultValue:
                                                rateForm.effectiveDateStart,
                                            onChange: (val) =>
                                                setFieldValue(
                                                    `${fieldNamePrefix}.effectiveDateStart`,
                                                    formatUserInputDate(val)
                                                ),
                                        }}
                                        endDateHint="mm/dd/yyyy"
                                        endDateLabel="End date"
                                        endDateError={showFieldErrors(
                                            'effectiveDateEnd'
                                        )}
                                        endDatePickerProps={{
                                            disabled: false,
                                            id: `${fieldNamePrefix}.effectiveDateEnd`,
                                            name: `${fieldNamePrefix}.effectiveDateEnd`,
                                            'aria-required': true,
                                            defaultValue:
                                                rateForm.effectiveDateEnd,
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
                            {isRateTypeAmendment(rateForm)
                                ? 'Date certified for rate amendment'
                                : 'Date certified'}
                        </Label>
                        <span className={styles.requiredOptionalText}>
                            Required
                        </span>
                        <div
                            className="usa-hint"
                            id={`rateDateCertifiedHint.${index}`}
                        >
                            mm/dd/yyyy
                        </div>
                        <PoliteErrorMessage
                            formFieldLabel={
                                isRateTypeAmendment(rateForm)
                                    ? 'Date certified for rate amendment'
                                    : 'Date certified'
                            }
                        >
                            {showFieldErrors('rateDateCertified')}
                        </PoliteErrorMessage>

                        <DatePicker
                            aria-required
                            aria-describedby={`rateDateCertifiedLabel.${index} rateDateCertifiedHint.${index}`}
                            id={`${fieldNamePrefix}.rateDateCertified`}
                            name={`${fieldNamePrefix}.rateDateCertified`}
                            defaultValue={rateForm.rateDateCertified}
                            onChange={(val) =>
                                setFieldValue(
                                    `${fieldNamePrefix}.rateDateCertified`,
                                    formatUserInputDate(val)
                                )
                            }
                            maxDate={dayjs(new Date()).format('YYYY-MM-DD')}
                        />
                    </FormGroup>
                </>
            )}
            <FormGroup>
                <ActuaryContactFields
                    shouldValidate={shouldValidate}
                    fieldNamePrefix={`${fieldNamePrefix}.actuaryContacts.0`}
                    fieldSetLegend="Certifying Actuary"
                />
                <FieldArray name={`${fieldNamePrefix}.addtlActuaryContacts`}>
                    {({ remove, push }: FieldArrayRenderProps) => (
                        <FormGroup data-testid="actuary-contacts">
                            {rateForm.addtlActuaryContacts.length > 0 &&
                                rateForm.addtlActuaryContacts.map(
                                    (_actuaryContact, index) => (
                                        <div
                                            className={styles.actuaryContact}
                                            key={index}
                                            data-testid="addtnl-actuary-contact"
                                        >
                                            <ActuaryContactFields
                                                shouldValidate={shouldValidate}
                                                fieldNamePrefix={`${fieldNamePrefix}.addtlActuaryContacts.${index}`}
                                                fieldSetLegend="Certifying actuary"
                                                inputRef={
                                                    newActuaryContactNameRef
                                                }
                                            />
                                            <ButtonWithLogging
                                                type="button"
                                                unstyled
                                                className={
                                                    styles.removeContactBtn
                                                }
                                                onClick={() => {
                                                    remove(index)
                                                    setNewActuaryContactButtonFocus()
                                                }}
                                                data-testid="removeContactBtn"
                                            >
                                                Remove certifying actuary
                                            </ButtonWithLogging>
                                        </div>
                                    )
                                )}
                            <button
                                type="button"
                                className={`usa-button usa-button--outline ${styles.addRateBtn}`}
                                onClick={() => {
                                    push(emptyActuaryContact)
                                    setFocusNewActuaryContact(true)
                                }}
                                ref={newActuaryContactButtonRef}
                            >
                                Add a certifying actuary
                            </button>
                        </FormGroup>
                    )}
                </FieldArray>
            </FormGroup>
            <FormGroup
                error={Boolean(
                    showFieldErrors('actuaryCommunicationPreference')
                )}
            >
                <Fieldset
                    className={styles.radioGroup}
                    legend="Actuaries' communication preference"
                    role="radiogroup"
                    aria-required
                >
                    <span
                        className={styles.requiredOptionalText}
                        style={{
                            marginBottom: '10px',
                        }}
                    >
                        Required
                    </span>
                    <span className="mcr-note">
                        Communication preference between CMS Office of the
                        Actuary (OACT) and all state’s actuaries (i.e.
                        certifying actuaries and additional actuary contacts)
                    </span>
                    <PoliteErrorMessage formFieldLabel="Actuaries' communication preference">
                        {showFieldErrors('actuaryCommunicationPreference') &&
                            getIn(errors, 'actuaryCommunicationPreference')}
                    </PoliteErrorMessage>
                    <FieldRadio
                        id={`${fieldNamePrefix}.actuaryCommunicationPreference.OACTtoActuary`}
                        name={`${fieldNamePrefix}.actuaryCommunicationPreference`}
                        label={`OACT can communicate directly with the state's actuaries but should copy the state on all written communication and all appointments for verbal discussions.`}
                        value={'OACT_TO_ACTUARY'}
                        aria-required
                        list_position={1}
                        list_options={2}
                        parent_component_heading="Actuaries' communication preference"
                        radio_button_title="OACT can communicate directly with the state's actuaries but should copy the state on all written communication and all appointments for verbal discussions."
                    />
                    <FieldRadio
                        id={`${fieldNamePrefix}.actuaryCommunicationPreference.OACTtoState`}
                        name={`${fieldNamePrefix}.actuaryCommunicationPreference`}
                        label={`OACT can communicate directly with the state, and the state will relay all written communication to their actuaries and set up time for any potential verbal discussions.`}
                        value={'OACT_TO_STATE'}
                        aria-required
                        list_position={2}
                        list_options={2}
                        parent_component_heading="Actuaries' communication preference"
                        radio_button_title="OACT can communicate directly with the state, and the state will relay all written communication to their actuaries and set up time for any potential verbal discussions."
                    />
                </Fieldset>
            </FormGroup>
        </>
    )
}
