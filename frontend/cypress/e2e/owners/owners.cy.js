import { API } from '../../support/api'
import ownerList from '../../fixtures/owners/owners-list.json'

const fillField = (dataCy, value) => {
    cy.get(`[data-cy="${dataCy}"]`).then(($el) => {
        const tagName = $el.prop('tagName').toLowerCase()

        // Use select() for dropdowns and clear/type for regular inputs,
        // so the same helper can be used with different form controls.
        if (tagName === 'select') {
            cy.wrap($el).select(value)
        } else {
            cy.wrap($el).clear().type(value)
        }
    })
}

describe('Owners list', () => {
    it('redirects an unauthenticated visit to /login', () => {
        // Visit the owners page without authentication to verify
        // that protected routes redirect unauthenticated users.
        cy.visitClean('/owners')

        cy.url().should('include', '/login')
    })

    it('renders owner data for an authenticated admin', () => {
        // Stub the owners endpoint so the test uses predictable fixture
        // data instead of depending on the backend database state.
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: ownerList,
        }).as('ownersRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        cy.contains('h1', 'Pet owners').should('be.visible')

        // Verify that authenticated users can see the clinic information
        // associated with the current account.
        cy.get('[data-cy="clinic-name"]').should('contain.text', 'Test Clinic')

        // Verify that every owner returned by the API is rendered in the table.
        ownerList.results.forEach((owner) => {
            cy.contains('a', `${owner.last_name}, ${owner.first_name}`.trim()).should('be.visible')
            cy.contains('td', owner.email).should('be.visible')
        })

        // The login form should not be present after successful authentication.
        cy.get('[data-cy="login-username"]').should('not.exist')
    })

    it('filters by last name', () => {
        // Stub the initial owners response and observe subsequent requests
        // to verify that filtering is passed to the API correctly.
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: ownerList,
        }).as('ownersRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        cy.get('#filter-last-name').type('Owe')

        // Verify that the entered last name is sent as the expected
        // case-insensitive query parameter.
        cy.wait('@ownersRequest')
            .its('request.query')
            .should('include', { last_name__icontains: 'Owe' })
    })

    it('shows an empty state when a filter matches nothing', () => {
        // Return an empty result set to simulate a filter with no matching owners.
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: { count: 0, next: null, previous: null, results: [] },
        }).as('ownersRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        cy.get('#filter-last-name').type('Nonexistent')
        cy.wait('@ownersRequest')

        // The page should clearly indicate that no owners match the filters.
        cy.contains('No owners match those filters').should('be.visible')

        // The add-owner action should not be shown in this empty filtered state.
        cy.get('[data-cy="owner-empty-add-button"]').should('not.exist')
    })

    it('sorts by last name when the column header is clicked', () => {
        // Stub the owners endpoint so the test can focus on the sorting request.
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: ownerList,
        }).as('ownersRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        cy.get('[data-cy="owner-sort-last-name"]').click()

        // Verify that clicking the column header sends the expected
        // descending last-name ordering parameter to the API.
        cy.wait('@ownersRequest')
            .its('request.query')
            .should('include', { ordering: '-last_name' })
    })

    it('creates a new owner', () => {
        // Stub the initial list request so the page loads with known data.
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: ownerList,
        }).as('ownersRequest')

        // Stub the create request and return the newly created owner.
        cy.intercept('POST', API.owners, {
            statusCode: 201,
            body: {
                id: 3,
                first_name: 'Peter',
                last_name: 'Nolan',
                phone_number: '+15559871234',
                email: 'peter.nolan@example.com',
                address: '1 King Street, Fairview',
                registration_date: '2026-08-10',
            },
        }).as('createRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        cy.get('[data-cy="owner-new-button"]').click()
        cy.contains('h2', 'New owner').should('be.visible')

        // Fill all required owner fields before submitting the form.
        fillField('owner-first-name', 'Peter')
        fillField('owner-last-name', 'Nolan')
        fillField('owner-phone-number', '+15559871234')
        fillField('owner-email', 'peter.nolan@example.com')
        fillField('owner-address', '1 King Street, Fairview')

        cy.get('[data-cy="owner-form-submit"]').click()

        // Verify that the frontend sends the expected owner data
        // to the create-owner endpoint.
        cy.wait('@createRequest').its('request.body').should('deep.equal', {
            first_name: 'Peter',
            last_name: 'Nolan',
            phone_number: '+15559871234',
            email: 'peter.nolan@example.com',
            address: '1 King Street, Fairview',
        })

        // A successful creation should display a confirmation toast
        // and close the new-owner form.
        cy.get('[data-cy="toast"]').should('contain.text', 'Owner added')
        cy.contains('h2', 'New owner').should('not.exist')
    })

    it('edits an existing owner', () => {
        // Stub the owners list and the update endpoint so the test
        // remains independent of the real backend state.
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: ownerList,
        }).as('ownersRequest')

        cy.intercept('PATCH', API.ownerDetail, {
            statusCode: 200,
            body: { ...ownerList.results[0], phone_number: '+15550009999' },
        }).as('updateRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        // Locate the specific owner row and open its edit form.
        cy.contains('[data-cy="owner-row"]', 'Owens, Anna').within(() => {
            cy.get('[data-cy="owner-edit-button"]').click()
        })

        cy.contains('h2', 'Edit owner').should('be.visible')

        // Verify that the edit form is populated with the existing owner data.
        cy.get('[data-cy="owner-first-name"]').should('have.value', 'Anna')

        fillField('owner-phone-number', '+15550009999')
        cy.get('[data-cy="owner-form-submit"]').click()

        // Verify that the updated phone number is included in the PATCH request.
        cy.wait('@updateRequest')
            .its('request.body')
            .should('deep.include', { phone_number: '+15550009999' })

        // A successful update should display a confirmation toast
        // and close the edit form.
        cy.get('[data-cy="toast"]').should('contain.text', 'Owner updated')
        cy.contains('h2', 'Edit owner').should('not.exist')
    })

    it('deletes an owner after confirming', () => {
        // Stub the owners list and delete endpoint to control the test state.
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: ownerList,
        }).as('ownersRequest')

        cy.intercept('DELETE', API.ownerDetail, { statusCode: 204 }).as('deleteRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        // Open the delete confirmation dialog for the selected owner.
        cy.contains('[data-cy="owner-row"]', 'Peters, Mark').within(() => {
            cy.get('[data-cy="owner-delete-button"]').click()
        })

        cy.contains('h2', 'Delete this owner?').should('be.visible')
        cy.contains('Mark').should('be.visible')

        // The delete request must not be sent until the user confirms the action.
        cy.get('@deleteRequest.all').should('have.length', 0)

        cy.get('[data-cy="confirm-dialog-confirm"]').click()

        cy.wait('@deleteRequest')

        // After a successful deletion, the user should see a confirmation
        // message and the confirmation dialog should close.
        cy.get('[data-cy="toast"]').should('contain.text', 'Mark Peters removed')
        cy.contains('h2', 'Delete this owner?').should('not.exist')
    })

    it('shows an error state when the owners list fails to load', () => {
        // Return a server error to verify that the page handles
        // failed API requests gracefully.
        cy.intercept('GET', API.owners, {
            statusCode: 500,
            body: { message: 'Internal server error' },
        }).as('ownersRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        // The user should see an error message, an accessible alert,
        // and an option to retry the failed request.
        cy.contains('Could not load this').should('be.visible')
        cy.get('[role="alert"]').should('be.visible')
        cy.get('[data-cy="error-retry-button"]').should('be.visible')

        // The owners table should not be rendered when the list request fails.
        cy.get('table').should('not.exist')
    })
})
