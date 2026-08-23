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
    beforeEach(() => {
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: ownerList,
        }).as('ownersRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest')
    })

    // Rendering 

    it('renders owner data for an authenticated admin', () => {
        cy.contains('h1', 'Pet owners').should('be.visible')
        cy.get('[data-cy="clinic-name"]').should('contain.text', 'Test Clinic')

        ownerList.results.forEach((owner) => {
            cy.contains('a', `${owner.last_name}, ${owner.first_name}`.trim()).should('be.visible')
            cy.contains('td', owner.email).should('be.visible')
        })

        cy.get('[data-cy="login-username"]').should('not.exist')
    })

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

    // Filtering 

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

    it('filters by email address', () => {
        const email = ownerList.results[0].email

        cy.intercept('GET', API.owners, (req) => {
            if (req.query.email__icontains === email) {
                req.alias = 'filterByEmail'
            }

            req.reply({
                statusCode: 200,
                body: ownerList,
            })
        })

        cy.get('#filter-email').type(email)

        cy.wait('@filterByEmail').its('request.query').should('include', { email__icontains: email })
    })

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

    // Sorting

    // The list loads sorted by last name, ascending, before any click.
    it('defaults to ascending order by last name on load', () => {
        cy.get('@ownersRequest.all').then((requests) => {
            expect(requests[0].request.query).to.include({ ordering: 'last_name' })
        })
    })

    it('sorts by last name when the column header is clicked', () => {
        cy.get('[data-cy="owner-sort-last-name"]').click()

        cy.wait('@ownersRequest')
            .its('request.query')
            .should('include', { ordering: '-last_name' })
    })

    it('switches to descending after clicking last name once', () => {
        cy.intercept('GET', API.owners, (req) => {
            if (req.query.ordering === '-last_name') {
                req.alias = 'descendingByLastName'
            }
            req.reply({ statusCode: 200, body: ownerList })
        })

        cy.get('[data-cy="owner-sort-last-name"]').click()

        cy.wait('@descendingByLastName')
            .its('request.query')
            .should('include', { ordering: '-last_name' })
    })

    // Second click may be served from cache, so check the UI indicator
    // instead of relying on a fresh network request.
    it('returns to ascending after clicking last name twice', () => {
        cy.intercept('GET', API.owners, (req) => {
            if (req.query.ordering === '-last_name') {
                req.alias = 'descendingByLastName'
            }
            req.reply({ statusCode: 200, body: ownerList })
        })

        cy.get('[data-cy="owner-sort-last-name"]').click()
        cy.wait('@descendingByLastName')

        cy.get('[data-cy="owner-sort-last-name"]').click()

        cy.get('[data-cy="owner-sort-last-name"]')
            .should('have.attr', 'aria-label', 'Sort by last name')
            .contains('↑')
    })

    it('order by registration date', () => {
        cy.intercept('GET', API.owners, (req) => {
            if (req.query.ordering === 'registration_date') {
                req.alias = 'sortByRegistrationDate'
            }
            req.reply({ statusCode: 200, body: ownerList })
        })

        cy.get('[data-cy="owner-sort-registration-date"]').click()

        cy.wait('@sortByRegistrationDate')
            .its('request.query')
            .should('include', { ordering: 'registration_date' })
    })

    it('reverses to descending after clicking registration date again', () => {
        cy.intercept('GET', API.owners, (req) => {
            if (req.query.ordering === 'registration_date') {
                req.alias = 'ascendingByRegistrationDate'
            }
            req.reply({ statusCode: 200, body: ownerList })
        })

        cy.get('[data-cy="owner-sort-registration-date"]').click()
        cy.wait('@ascendingByRegistrationDate')

        cy.intercept('GET', API.owners, (req) => {
            if (req.query.ordering === '-registration_date') {
                req.alias = 'descendingByRegistrationDate'
            }
            req.reply({ statusCode: 200, body: ownerList })
        })

        cy.get('[data-cy="owner-sort-registration-date"]').click()

        cy.wait('@descendingByRegistrationDate')
            .its('request.query')
            .should('include', { ordering: '-registration_date' })
    })

    // Create 

    it('creates a new owner', () => {
        cy.intercept('POST', API.owners, {
            statusCode: 201,
            body: {
                id: 3,
                ...newOwner.newOwner,
                registration_date: '2026-08-10',
            },
        }).as('createRequest')

        cy.get('[data-cy="owner-new-button"]').click()
        cy.contains('h2', 'New owner').should('be.visible')

        fillField('owner-first-name', newOwner.newOwner.first_name)
        fillField('owner-last-name', newOwner.newOwner.last_name)
        fillField('owner-phone-number', newOwner.newOwner.phone_number)
        fillField('owner-email', newOwner.newOwner.email)
        fillField('owner-address', newOwner.newOwner.address)

        cy.get('[data-cy="owner-form-submit"]').click()

        cy.wait('@createRequest').its('request.body').should('deep.equal', newOwner.newOwner)

        cy.get('[data-cy="toast"]').should('contain.text', 'Owner added')
        cy.contains('h2', 'New owner').should('not.exist')
    })

    it('fills form with empty fields', () => {
        cy.intercept('POST', API.owners, cy.spy().as('createSpy'))

        cy.get('[data-cy="owner-new-button"]').click()
        cy.contains('h2', 'New owner').should('be.visible')

        cy.get('[data-cy="owner-form-submit"]').click()

        cy.get('[data-cy="owner-first-name-error"]').should('be.visible')
        cy.get('[data-cy="owner-last-name-error"]').should('be.visible')
        cy.get('[data-cy="owner-phone-number-error"]').should('be.visible')

        cy.get('@createSpy').should('not.have.been.called')
        cy.contains('h2', 'New owner').should('be.visible')
    })

    it('can not make same owners', () => {
        cy.intercept('POST', API.owners, {
            statusCode: 400,
            body: {
                error: {
                    code: 'ValidationError',
                    message: 'Validation failed',
                    details: {
                        email: ['This email is already registered for this clinic'],
                    },
                },
            },
        }).as('sameOwnerRequest')

        cy.get('[data-cy="owner-new-button"]').click()
        cy.contains('h2', 'New owner').should('be.visible')

        fillField('owner-first-name', newOwner.newOwner.first_name)
        fillField('owner-last-name', newOwner.newOwner.last_name)
        fillField('owner-phone-number', newOwner.newOwner.phone_number)
        fillField('owner-email', newOwner.newOwner.email)
        fillField('owner-address', newOwner.newOwner.address)

        cy.get('[data-cy="owner-form-submit"]').click()

        cy.wait('@sameOwnerRequest')

        cy.get('[data-cy="owner-email-error"]')
            .should('be.visible')
            .and('contain.text', 'already registered')

        cy.contains('h2', 'New owner').should('be.visible')
    })

    // Edit 

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

    // Delete 

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
})