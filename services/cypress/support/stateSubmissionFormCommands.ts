Cypress.Commands.add('startNewContractOnlySubmissionWithBaseContract', () => {
    // Must be on '/submissions/new'
    cy.findByTestId('state-dashboard-page').should('exist')
    cy.findByRole('link', { name: 'Start new submission' }).click()
    cy.findByRole('heading', { level: 1, name: /New submission/ })

    cy.fillOutContractActionOnlyWithBaseContract()

    cy.navigateFormByButtonClick('CONTINUE_FROM_START_NEW')
    cy.findByRole('heading', { level: 2, name: /Contract details/ })
})

Cypress.Commands.add('startNewContractOnlySubmissionWithAmendment', () => {
    // Must be on '/submissions/new'
    cy.findByTestId('state-dashboard-page').should('exist')
    cy.findByRole('link', { name: 'Start new submission' , timeout: 5000}).click()
    cy.findByRole('heading', { level: 1, name: /New submission/ })

    cy.fillOutContractActionOnlyWithAmendment()

    cy.navigateFormByButtonClick('CONTINUE_FROM_START_NEW')
    cy.findByRole('heading', { level: 2, name: /Contract details/ })
})

Cypress.Commands.add('startNewContractAndRatesSubmission', () => {
    // Must be on '/submissions/new'
    cy.findByTestId('state-dashboard-page').should('exist')
    cy.findByRole('link', { name: 'Start new submission', timeout: 5000 }).click()
    cy.findByRole('heading', { level: 1, name: /New submission/ })

    cy.fillOutContractActionAndRateCertification()

    cy.navigateFormByButtonClick('CONTINUE_FROM_START_NEW')
    cy.findByRole('heading', { level: 2, name: /Contract details/ })
})

Cypress.Commands.add('fillOutContractActionOnlyWithBaseContract', () => {
    // Must be on '/submissions/new'
    cy.get('label[for="medicaid"]').click()

    cy.findByRole('combobox', {
        name: 'Programs this contract action covers (required)',
        timeout: 2_000
    }).click({
        force: true,
    })
    cy.findByText('PMAP').click()
    cy.findByText('Contract action only').click()
    cy.findByText('Base contract').click()

        //rate-cert-assurance
        cy.get('label[for="riskBasedContractNo"]').click()

        cy.findByRole('textbox', { name: 'Submission description' }).type(
            'description of contract only submission'
        )
})

Cypress.Commands.add('fillOutContractActionOnlyWithAmendment', () => {
    // Must be on '/submissions/new'
    cy.get('label[for="medicaid"]').click()
    cy.findByRole('combobox', {
        name: 'Programs this contract action covers (required)', timeout: 2_000
    }).click({
        force: true,
    })
    cy.findByText('PMAP').click()
    cy.findByText('Contract action only').click()

        cy.findByText('Contract action only').click()

        //rate-cert-assurance
        cy.get('label[for="riskBasedContractNo"]').click()

        cy.findByText('Amendment to base contract').click()
        cy.findByRole('textbox', { name: 'Submission description' }).type(
            'description of contract only submission'
        )
    })

Cypress.Commands.add('fillOutContractActionAndRateCertification', () => {
    // Must be on '/submissions/new'
    cy.get('label[for="medicaid"]').click()
    cy.findByRole('combobox', {
        name: 'Programs this contract action covers (required)', timeout: 2_000
    }).click({
        force: true,
    })
    cy.findByText('PMAP').click()
    cy.findByText('Contract action and rate certification').click()

        //rate-cert-assurance
        cy.get('label[for="riskBasedContractNo"]').click()

        cy.findByText('Base contract').click()
        cy.findByRole('textbox', { name: 'Submission description' }).type(
            'description of contract and rates submission'
        )
    })
Cypress.Commands.add('fillOutBaseContractDetails', () => {
    // Must be on '/submissions/:id/edit/contract-details'
    // Contract 438 attestation question
    cy.findByText('Yes the contract fully complies with all applicable requirements.').click()

    cy.findByText('Fully executed').click()
    cy.findAllByLabelText('Start date', {timeout: 2000})
        .parents()
        .findByTestId('date-picker-external-input')
        .type('04/01/2024')
        .blur()
    cy.findAllByLabelText('End date')
        .parents()
        .findByTestId('date-picker-external-input')
        .type('03/31/2025')
        .blur()
    cy.findByLabelText('Managed Care Organization (MCO)').safeClick()
    cy.findByLabelText('1932(a) State Plan Authority').safeClick()
    cy.findByTestId('file-input-input').attachFile(
        'documents/trussel-guide.pdf'
    )

    cy.findByText('In Lieu-of Services and Settings (ILOSs) in accordance with 42 CFR § 438.3(e)(2)')
    .parent()
    .within(() => {
        cy.findByText('No').click()
    })
    cy.findByText(
        /Risk-sharing strategy/
    )
        .parent()
        .within(() => {
            cy.findByText('Yes').click()
        })
    cy.findByText(
        'Incentive arrangements in accordance with 42 CFR § 438.6(b)(2)'
    )
        .parent()
        .within(() => {
            cy.findByText('Yes').click()
        })
    cy.findByText(
        'Withhold arrangements in accordance with 42 CFR § 438.6(b)(3)'
    )
        .parent()
        .within(() => {
            cy.findByText('No').click()
        })
    cy.findByText(
        'State directed payments in accordance with 42 CFR § 438.6(c)'
    )
        .parent()
        .within(() => {
            cy.findByText('No').click()
        })
    cy.findByText('Pass-through payments in accordance with 42 CFR § 438.6(d)')
        .parent()
        .within(() => {
            cy.findByText('No').click()
        })
    cy.findByText(
        'Payments to MCOs and PIHPs for enrollees that are a patient in an institution for mental disease in accordance with 42 CFR § 438.6(e)'
    )
        .parent()
        .within(() => {
            cy.findByText('Yes').click()
        })
    cy.findByText(/Non-risk payment arrangements/)
        .parent()
        .within(() => {
            cy.findByText('Yes').click()
        })

    cy.verifyDocumentsHaveNoErrors()
    cy.waitForDocumentsToLoad()
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutAmendmentToBaseContractDetails', () => {
    // Must be on '/submissions/:id/edit/contract-details'
    cy.findByText('Unexecuted by some or all parties').click()

    cy.findAllByLabelText('Start date', {timeout: 2000})
        .parents()
        .findByTestId('date-picker-external-input')
        .type('04/01/2024')
    cy.findAllByLabelText('End date')
        .parents()
        .findByTestId('date-picker-external-input')
        .type('03/31/2025')
        .blur()
    cy.findByLabelText('Managed Care Organization (MCO)').safeClick()
    cy.findByLabelText('1932(a) State Plan Authority').safeClick()

    // fill out the yes/nos
    cy.findByText('In Lieu-of Services and Settings (ILOSs) in accordance with 42 CFR § 438.3(e)(2)')
    .parent()
    .within(() => {
        cy.findByText('No').click()
    })

    cy.findByText('Benefits provided by the managed care plans')
        .parent()
        .within(() => {
            cy.findByText('Yes').click()
        })

    cy.findByText('Geographic areas served by the managed care plans')
        .parent()
        .within(() => {
            cy.findByText('Yes').click()
        })
    cy.findByText(
        'Medicaid beneficiaries served by the managed care plans (e.g. eligibility or enrollment criteria)'
    )
        .parent()
        .within(() => {
            cy.findByText('Yes').click()
        })
    cy.findByText(
        /Risk-sharing strategy/
    )
        .parent()
        .within(() => {
            cy.findByText('Yes').click()
        })
    cy.findByText(
        'Incentive arrangements in accordance with 42 CFR § 438.6(b)(2)'
    )
        .parent()
        .within(() => {
            cy.findByText('Yes').click()
        })
    cy.findByText(
        'Withhold arrangements in accordance with 42 CFR § 438.6(b)(3)'
    )
        .parent()
        .within(() => {
            cy.findByText('No').click()
        })
    cy.findByText(
        'State directed payments in accordance with 42 CFR § 438.6(c)'
    )
        .parent()
        .within(() => {
            cy.findByText('No').click()
        })
    cy.findByText('Pass-through payments in accordance with 42 CFR § 438.6(d)')
        .parent()
        .within(() => {
            cy.findByText('No').click()
        })
    cy.findByText(
        'Payments to MCOs and PIHPs for enrollees that are a patient in an institution for mental disease in accordance with 42 CFR § 438.6(e)'
    )
        .parent()
        .within(() => {
            cy.findByText('Yes').click()
        })
    cy.findByText(
        'Medical loss ratio standards in accordance with 42 CFR § 438.8'
    )
        .parent()
        .within(() => {
            cy.findByText('Yes').click()
        })
    cy.findByText(
        'Other financial, payment, incentive or related contractual provisions'
    )
        .parent()
        .within(() => {
            cy.findByText('Yes').click()
        })
    cy.findByText(
        'Enrollment/disenrollment process'
    )
        .parent()
        .within(() => {
            cy.findByText('Yes').click()
        })
    cy.findByText('Grievance and appeal system')
        .parent()
        .within(() => {
            cy.findByText('No').click()
        })
    cy.findByText('Network adequacy standards')
        .parent()
        .within(() => {
            cy.findByText('Yes').click()
        })
    cy.findByText('Length of the contract period')
        .parent()
        .within(() => {
            cy.findByText('No').click()
        })
    cy.findByText(/Non-risk payment arrangements/)
        .parent()
        .within(() => {
            cy.findByText('Yes').click()
        })

    cy.findByTestId('file-input-input').attachFile(
        'documents/trussel-guide.pdf'
    )

    cy.verifyDocumentsHaveNoErrors()
    cy.waitForDocumentsToLoad()
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutNewRateCertification', () => {
    // Must be on '/submissions/:id/edit/rate-details'
    // Must be a contract and rates submission
    cy.findByRole('radiogroup', {
        name: /Was this rate certification uploaded to any other submissions?/,
    })
        .should('exist')
        .within(() => {
            cy.findByText('No').click()
        })

    cy.findByText('New rate certification').click()
    cy.findByText(
        'Certification of capitation rates specific to each rate cell'
    ).click()

    cy.findAllByLabelText('Start date', {timeout: 2000})
        .parents()
        .findByTestId('date-picker-external-input')
        .type('02/29/2024')
    cy.findAllByLabelText('End date')
        .parents()
        .findByTestId('date-picker-external-input')
        .type('02/28/2025')
        .blur()
    cy.findByLabelText('Date certified').type('03/01/2024')

    cy.findByRole('combobox', { name: 'programs (required)' }).click({
        force: true,
    })
    cy.findByText('PMAP').click()

    //Fill out certifying actuary
    cy.findAllByLabelText('Name').eq(0).click().type('Actuary Contact Person')
    cy.findAllByLabelText('Title/Role').eq(0).type('Actuary Contact Title')
    cy.findAllByLabelText('Email').eq(0).type('actuarycontact@example.com')
    cy.findAllByLabelText('Mercer').eq(0).safeClick()

    // Upload a rate certification and rate supporting document
    cy.findAllByTestId('file-input-input').each(fileInput =>
        cy.wrap(fileInput).attachFile('documents/trussel-guide.pdf')
    )

    cy.verifyDocumentsHaveNoErrors()
    cy.waitForDocumentsToLoad()
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutAmendmentToPriorRateCertification', (id = 0) => {
    // Must be on '/submissions/:id/edit/rate-details'
    // Must be a contract and rates submission
    cy.findByRole('radiogroup', {
        name: /Was this rate certification uploaded to any other submissions?/,
    })
        .should('exist')
        .within(() => {
            cy.findByText('No').click()
        })

    cy.findByText('Amendment to prior rate certification').click()
    cy.findByText(
        'Certification of capitation rates specific to each rate cell'
    ).click()

    /*
    There are currently multiple date range pickers on the page with the same label names (start date, end date) and different headings
    Preferred approach would be targeting by via findBy* or a custom data-cyid attribute
    However, surfacing custom attributes on the nested inputs in third party component DateRangePicker not possible in current react-uswds version
    For now using targeting by html id (anti-pattern)
*/
    cy.get(`[id="rateInfos.${id}.rateDateStart"]`, {timeout: 2000}).type('02/01/2023')
    cy.get(`[id="rateInfos.${id}.rateDateEnd"]`).type('03/01/2025')
    cy.get(`[id="rateInfos.${id}.effectiveDateStart"]`).type('03/01/2024')
    cy.get(`[id="rateInfos.${id}.effectiveDateEnd"]`).type('03/01/2025')

    cy.findByRole('combobox', { name: 'programs (required)' }).click({
        force: true,
    })
    cy.findByText('PMAP').click()
    cy.findByLabelText('Date certified for rate amendment').type('03/01/2024')

    //Fill out certifying actuary
    cy.findAllByLabelText('Name').eq(0).click().type('Actuary Contact Person')
    cy.findAllByLabelText('Title/Role').eq(0).type('Actuary Contact Title')
    cy.findAllByLabelText('Email').eq(0).type('actuarycontact@example.com')
    cy.findAllByLabelText('Mercer').eq(0).safeClick()

    // Upload a rate certification and rate supporting document
    cy.findAllByTestId('file-input-input').each(fileInput =>
        cy.wrap(fileInput).attachFile('documents/trussel-guide.pdf')
    )

    cy.verifyDocumentsHaveNoErrors()
    cy.waitForDocumentsToLoad()
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutStateContact', () => {
    // Must be on '/submissions/:id/contacts'
    cy.findAllByLabelText('Name').eq(0).click().type('State Contact Person')
    cy.findAllByLabelText('Name')
        .eq(0)
        .should('have.value', 'State Contact Person') // this assertion is here to catch flakes early due to state contact person value not persisting
    cy.findAllByLabelText('Title/Role').eq(0).type('State Contact Title')
    cy.findAllByLabelText('Email').eq(0).type('mc-review-qa@truss.works')
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutAdditionalActuaryContact', () => {
    // Must be on '/submissions/:id/edit/contacts'
    // Must be a contract and rates submission
    cy.findByRole('button', { name: 'Add actuary contact' })
        .should('exist')
        .click()
    cy.findByText('Additional actuary contact 1').should('exist')
    cy.findAllByLabelText('Name').eq(1).click().type('Actuary Contact Person')
    cy.findAllByLabelText('Title/Role').eq(1).type('Actuary Contact Title')
    cy.findAllByLabelText('Email').eq(1).type('actuarycontact@example.com')

    // Actuarial firm
    cy.findAllByLabelText('Mercer').eq(0).safeClick()

    // Actuary communication preference
    cy.findByText(
        `OACT can communicate directly with the state’s actuaries but should copy the state on all written communication and all appointments for verbal discussions.`
    ).click()
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutSupportingDocuments', () => {
    // Must be on '/submissions/:id/edit/documents'
    cy.findByTestId('file-input-input').attachFile(
        'documents/trussel-guide.pdf'
    )

    cy.findByTestId('file-input-input').attachFile('documents/testing.csv')

    cy.verifyDocumentsHaveNoErrors()

    // twice because there could be validation errors with checkbox
    cy.verifyDocumentsHaveNoErrors()

    cy.waitForDocumentsToLoad()
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

// for fileupload with the table view and checkboxes- tableView can be assigned to a number that representes how many items in the list should be preses
Cypress.Commands.add('waitForDocumentsToLoad', ({ tableView } = {tableView: false}) => {
    if (tableView) {
        cy.findAllByTestId('file-input-loading-image', {
            timeout: 200_000,
        }).should('not.exist')
    } else {
        // list view is the default behavior
        cy.findAllByTestId('file-input-preview-image', {
            timeout: 200_000,
        }).should('not.have.class', 'is-loading')
    }
})

Cypress.Commands.add('verifyDocumentsHaveNoErrors', () => {
    cy.findByText(/Upload failed/).should('not.exist')
    cy.findByText('Duplicate file, please remove').should('not.exist')
    cy.findByText('Failed security scan, please remove').should('not.exist')
    cy.findByText('Remove files with errors').should('not.exist')
})

Cypress.Commands.add(
    'submitStateSubmissionForm',
    ({success, resubmission, summary} = { success: true, resubmission: false }) => {
        cy.findByRole('heading', { level: 2, name: /Review and submit/ })
        cy.findByRole('button', {
            name: 'Submit',
        }).safeClick()

        cy.findAllByTestId('modalWindow')
            .eq(1)
            .should('exist')
            .within(() => {
                if (resubmission) {
                    cy.get('#unlockSubmitModalInput').type(
                        summary || 'Resubmission summary'
                    )
                    cy.findByTestId('resubmit-modal-submit').click()
                } else {
                    cy.findByTestId('submit-modal-submit').click()
                }
            })
        cy.wait('@submitHealthPlanPackageMutation', { timeout: 50_000 })
        if (success) {
            cy.findByTestId('state-dashboard-page').should('exist')
            cy.findByRole('heading',{name:'Submissions'}).should('exist')
        }

    }
)
