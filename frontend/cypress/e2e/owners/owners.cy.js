import { API } from '../../support/api'
import ownerList from '../../fixtures/owners/owners-list.json'
import newOwner from '../../fixtures/owners/new-owner.json'

// Fills a form field, picking the right Cypress command based on element type
const fillField = (dataCy, value) => {
    cy.get(`[data-cy="${dataCy}"]`).then(($el) => {
        const tagName = $el.prop('tagName').toLowerCase()

        if (tagName === 'select') {
            cy.wrap($el).select(value)
        } else {
            cy.wrap($el).clear().type(value)
        }
    })
}

describe('Owners list', () => {
    // Stub the owners list request and log in before every test
    beforeEach(() => {
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: ownerList,
        }).as('ownersRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest')
    })

    // Page shows clinic name and full owner list for a logged-in admin
    it('renders owner data for an authenticated admin', () => {
        cy.contains('h1', 'Pet owners').should('be.visible')
        cy.get('[data-cy="clinic-name"]').should('contain.text', 'Test Clinic')

        ownerList.results.forEach((owner) => {
            cy.contains('a', `${owner.last_name}, ${owner.first_name}`.trim()).should('be.visible')
            cy.contains('td', owner.email).should('be.visible')
        })

        cy.get('[data-cy="login-username"]').should('not.exist')
    })

    // Typing a last name triggers a filtered request with the right query param
    it('filters by last name', () => {
        const lastName = ownerList.results[0].last_name

        cy.intercept('GET', API.owners, (req) => {
            if (req.query.last_name__icontains === lastName) {
                req.alias = 'filterByLastName'
            }

            req.reply({
                statusCode: 200,
                body: ownerList,
            })
        })

        cy.get('#filter-last-name').type(lastName)

        cy.wait('@filterByLastName')
            .its('request.query')
            .should('include', { last_name__icontains: lastName })
    })

    // Same as above, but for the first name filter
    it('filters by first name', () => {
        const firstName = ownerList.results[0].first_name

        cy.intercept('GET', API.owners, (req) => {
            if (req.query.first_name__icontains === firstName) {
                req.alias = 'filterByFirstName'
            }

            req.reply({
                statusCode: 200,
                body: ownerList,
            })
        })

        cy.get('#filter-first-name').type(firstName)

        cy.wait('@filterByFirstName')
            .its('request.query')
            .should('include', { first_name__icontains: firstName })
    })

    // No results should show an empty state and hide the "add owner" shortcut
    it('shows an empty state when a filter matches nothing', () => {
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: { count: 0, next: null, previous: null, results: [] },
        }).as('emptyOwnersRequest')

        cy.get('#filter-last-name').type('Nonexistent')
        cy.wait('@emptyOwnersRequest')

        cy.contains('No owners match those filters').should('be.visible')
        cy.get('[data-cy="owner-empty-add-button"]').should('not.exist')
    })

    // Clicking the column header sorts the list by last name descending
    it('sorts by last name when the column header is clicked', () => {
        cy.get('[data-cy="owner-sort-last-name"]').click()

        cy.wait('@ownersRequest')
            .its('request.query')
            .should('include', { ordering: '-last_name' })
    })

    // Filling out and submitting the form creates a new owner
    it('creates a new owner', () => {
        cy.intercept('POST', API.owners, {
            statusCode: 201,
            body: {
                id: 3,
                ...newOwner,
                registration_date: '2026-08-10',
            },
        }).as('createRequest')

        cy.get('[data-cy="owner-new-button"]').click()
        cy.contains('h2', 'New owner').should('be.visible')

        fillField('owner-first-name', newOwner.first_name)
        fillField('owner-last-name', newOwner.last_name)
        fillField('owner-phone-number', newOwner.phone_number)
        fillField('owner-email', newOwner.email)
        fillField('owner-address', newOwner.address)

        cy.get('[data-cy="owner-form-submit"]').click()

        cy.wait('@createRequest').its('request.body').should('deep.equal', newOwner)

        cy.get('[data-cy="toast"]').should('contain.text', 'Owner added')
        cy.contains('h2', 'New owner').should('not.exist')
    })

    // Editing an existing owner's phone number updates the record
    it('edits an existing owner', () => {
        cy.intercept('PATCH', API.ownerDetail, {
            statusCode: 200,
            body: { ...ownerList.results[0], phone_number: '+15550009999' },
        }).as('updateRequest')

        cy.contains('[data-cy="owner-row"]', 'Owens, Anna').within(() => {
            cy.get('[data-cy="owner-edit-button"]').click()
        })

        cy.contains('h2', 'Edit owner').should('be.visible')
        cy.get('[data-cy="owner-first-name"]').should('have.value', 'Anna')

        fillField('owner-phone-number', '+15550009999')
        cy.get('[data-cy="owner-form-submit"]').click()

        cy.wait('@updateRequest')
            .its('request.body')
            .should('deep.include', { phone_number: '+15550009999' })

        cy.get('[data-cy="toast"]').should('contain.text', 'Owner updated')
        cy.contains('h2', 'Edit owner').should('not.exist')
    })

    // Deleting requires confirmation before the request actually fires
    it('deletes an owner after confirming', () => {
        cy.intercept('DELETE', API.ownerDetail, { statusCode: 204 }).as('deleteRequest')

        cy.contains('[data-cy="owner-row"]', 'Peters, Mark').within(() => {
            cy.get('[data-cy="owner-delete-button"]').click()
        })

        cy.contains('h2', 'Delete this owner?').should('be.visible')
        cy.contains('Mark').should('be.visible')
        cy.get('@deleteRequest.all').should('have.length', 0)

        cy.get('[data-cy="confirm-dialog-confirm"]').click()
        cy.wait('@deleteRequest')

        cy.get('[data-cy="toast"]').should('contain.text', 'Mark Peters removed')
        cy.contains('h2', 'Delete this owner?').should('not.exist')
    })

    // A failed GET shows the error state instead of the table
    it('shows an error state when the owners list fails to load', () => {
        cy.intercept('GET', API.owners, {
            statusCode: 500,
            body: { message: 'Internal server error' },
        }).as('failedOwnersRequest')

        cy.reload()
        cy.wait('@failedOwnersRequest')

        cy.contains('Could not load this').should('be.visible')
        cy.get('[role="alert"]').should('be.visible')
        cy.get('[data-cy="error-retry-button"]').should('be.visible')
        cy.get('table').should('not.exist')
    })
})