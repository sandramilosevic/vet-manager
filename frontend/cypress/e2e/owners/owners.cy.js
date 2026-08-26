import { API } from '../../support/api'
import { generateOwners } from '../../support/utils/generate-owners'
import ownerList from '../../fixtures/owners/owners-list.json'
import newOwner from '../../fixtures/owners/new-owner.json'
import { OwnersPage } from '../../pages/OwnersPage'
import { OwnerForm } from '../../pages/OwnerForm'

const PAGE_SIZE = 15

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
        OwnersPage.heading().should('be.visible')
        OwnersPage.clinicName().should('contain.text', 'Test Clinic')

        ownerList.results.forEach((owner) => {
            cy.contains(
                'a',
                `${owner.last_name}, ${owner.first_name}`.trim(),
            ).should('be.visible')

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
        OwnersPage.retryButton().should('be.visible')
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

        OwnersPage.typeFilterLastName(lastName)

        cy.wait('@filterByLastName')
            .its('request.query')
            .should('include', {
                last_name__icontains: lastName,
            })
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

        OwnersPage.typeFilterFirstName(firstName)

        cy.wait('@filterByFirstName')
            .its('request.query')
            .should('include', {
                first_name__icontains: firstName,
            })
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

        OwnersPage.typeFilterEmail(email)

        cy.wait('@filterByEmail')
            .its('request.query')
            .should('include', {
                email__icontains: email,
            })
    })

    it('shows an empty state when a filter matches nothing', () => {
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: {
                count: 0,
                next: null,
                previous: null,
                results: [],
            },
        }).as('emptyOwnersRequest')

        OwnersPage.typeFilterLastName('Nonexistent')
        cy.wait('@emptyOwnersRequest')

        cy.contains('No owners match those filters').should('be.visible')
        OwnersPage.emptyAddButton().should('not.exist')
    })

    // Sorting

    it('defaults to ascending order by last name on load', () => {
        cy.get('@ownersRequest.all').then((requests) => {
            expect(requests[0].request.query).to.include({
                ordering: 'last_name',
            })
        })
    })

    it('sorts by last name when the column header is clicked', () => {
        OwnersPage.sortIndicatorFor(OwnersPage.sortByLastName)
            .should('contain', '↑')

        OwnersPage.sortByLastName().click()

        cy.wait('@ownersRequest')
            .its('request.query')
            .should('include', {
                ordering: '-last_name',
            })

        OwnersPage.sortIndicatorFor(OwnersPage.sortByLastName)
            .should('contain', '↓')
    })

    it('switches to descending after clicking last name once', () => {
        cy.intercept('GET', API.owners, (req) => {
            if (req.query.ordering === '-last_name') {
                req.alias = 'descendingByLastName'
            }

            req.reply({
                statusCode: 200,
                body: ownerList,
            })
        })

        OwnersPage.sortByLastName().click()

        cy.wait('@descendingByLastName')
            .its('request.query')
            .should('include', {
                ordering: '-last_name',
            })
    })

    it('returns to ascending after clicking last name twice', () => {
        cy.intercept('GET', API.owners, (req) => {
            if (req.query.ordering === '-last_name') {
                req.alias = 'descendingByLastName'
            }

            req.reply({
                statusCode: 200,
                body: ownerList,
            })
        })

        OwnersPage.sortByLastName().click()
        cy.wait('@descendingByLastName')

        OwnersPage.sortByLastName().click()

        OwnersPage.sortIndicatorFor(OwnersPage.sortByLastName)
            .should('contain', '↑')

        OwnersPage.sortByLastName()
            .should('have.attr', 'aria-label', 'Sort by last name')
    })

    it('orders by registration date', () => {
        OwnersPage.sortIndicatorFor(OwnersPage.sortByRegistrationDate)
            .should('contain', '↕')

        cy.intercept('GET', API.owners, (req) => {
            if (req.query.ordering === 'registration_date') {
                req.alias = 'sortByRegistrationDate'
            }

            req.reply({
                statusCode: 200,
                body: ownerList,
            })
        })

        OwnersPage.sortByRegistrationDate().click()

        cy.wait('@sortByRegistrationDate')
            .its('request.query')
            .should('include', {
                ordering: 'registration_date',
            })

        OwnersPage.sortIndicatorFor(OwnersPage.sortByRegistrationDate)
            .should('contain', '↑')
    })

    it('reverses to descending after clicking registration date again', () => {
        cy.intercept('GET', API.owners, (req) => {
            if (req.query.ordering === 'registration_date') {
                req.alias = 'ascendingByRegistrationDate'
            }

            req.reply({
                statusCode: 200,
                body: ownerList,
            })
        })

        OwnersPage.sortByRegistrationDate().click()

        cy.wait('@ascendingByRegistrationDate')

        OwnersPage.sortIndicatorFor(OwnersPage.sortByRegistrationDate)
            .should('contain', '↑')

        cy.intercept('GET', API.owners, (req) => {
            if (req.query.ordering === '-registration_date') {
                req.alias = 'descendingByRegistrationDate'
            }

            req.reply({
                statusCode: 200,
                body: ownerList,
            })
        })

        OwnersPage.sortByRegistrationDate().click()

        cy.wait('@descendingByRegistrationDate')
            .its('request.query')
            .should('include', {
                ordering: '-registration_date',
            })
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

        OwnersPage.newOwnerButton().click()

        OwnerForm.heading('New owner').should('be.visible')
        OwnerForm.fillAll(newOwner.newOwner)
        OwnerForm.submit()

        cy.wait('@createRequest')
            .its('request.body')
            .should('deep.equal', newOwner.newOwner)

        OwnersPage.toast().should('contain.text', 'Owner added')
        OwnerForm.heading('New owner').should('not.exist')
    })

    it('fills form with empty fields', () => {
        cy.intercept('POST', API.owners, cy.spy().as('createSpy'))

        OwnersPage.newOwnerButton().click()

        OwnerForm.heading('New owner').should('be.visible')
        OwnerForm.submit()

        OwnerForm.firstNameError().should('be.visible')
        OwnerForm.lastNameError().should('be.visible')
        OwnerForm.phoneNumberError().should('be.visible')

        cy.get('@createSpy').should('not.have.been.called')
        OwnerForm.heading('New owner').should('be.visible')
    })

    it('cannot create duplicate owners', () => {
        cy.intercept('POST', API.owners, {
            statusCode: 400,
            body: {
                error: {
                    code: 'ValidationError',
                    message: 'Validation failed',
                    details: {
                        email: [
                            'This email is already registered for this clinic',
                        ],
                    },
                },
            },
        }).as('sameOwnerRequest')

        OwnersPage.newOwnerButton().click()

        OwnerForm.heading('New owner').should('be.visible')
        OwnerForm.fillAll(newOwner.newOwner)
        OwnerForm.submit()

        cy.wait('@sameOwnerRequest')

        OwnerForm.emailError()
            .should('be.visible')
            .and('contain.text', 'already registered')

        OwnerForm.heading('New owner').should('be.visible')
    })

    // Edit

    it('edits an existing owner', () => {
        const owner = ownerList.results[0]
        const fullName = `${owner.last_name}, ${owner.first_name}`

        cy.intercept('PATCH', API.ownerDetail, {
            statusCode: 200,
            body: {
                ...owner,
                phone_number: '+15550009999',
            },
        }).as('updateRequest')

        OwnersPage.editButtonFor(fullName).click()

        OwnerForm.heading('Edit owner').should('be.visible')
        OwnerForm.firstName().should('have.value', owner.first_name)

        cy.fillField('owner-phone-number', '+15550009999')
        OwnerForm.submit()

        cy.wait('@updateRequest')
            .its('request.body')
            .should('deep.include', {
                phone_number: '+15550009999',
            })

        OwnersPage.toast().should('contain.text', 'Owner updated')
        OwnerForm.heading('Edit owner').should('not.exist')
    })

    it('cancels editing an owner', () => {
        const owner = ownerList.results[0]
        const fullName = `${owner.last_name}, ${owner.first_name}`

        OwnersPage.editButtonFor(fullName).click()

        OwnerForm.heading('Edit owner').should('be.visible')
        OwnerForm.cancel()

        OwnersPage.ownerRow(fullName).should('be.visible')
    })

    // Delete

    it('deletes an owner after confirming', () => {
        const owner = ownerList.results[0]
        const fullName = `${owner.last_name}, ${owner.first_name}`

        cy.intercept('DELETE', API.ownerDetail, {
            statusCode: 204,
        }).as('deleteRequest')

        OwnersPage.deleteButtonFor(fullName).click()

        cy.contains('h2', 'Delete this owner?').should('be.visible')
        cy.contains(owner.first_name).should('be.visible')

        cy.get('@deleteRequest.all').should('have.length', 0)

        cy.get('[data-cy="confirm-dialog-confirm"]').click()

        cy.wait('@deleteRequest')

        OwnersPage.toast()
            .should(
                'contain.text',
                `${owner.first_name} ${owner.last_name} removed`,
            )

        cy.contains('h2', 'Delete this owner?').should('not.exist')
    })

    it('cancels deleting an owner', () => {
        const owner = ownerList.results[1]
        const fullName = `${owner.last_name}, ${owner.first_name}`

        OwnersPage.deleteButtonFor(fullName).click()

        cy.contains('h2', 'Delete this owner?').should('be.visible')
        cy.contains(owner.first_name).should('be.visible')

        cy.get('[data-cy="confirm-dialog-cancel"]').click()

        OwnersPage.ownerRow(fullName).should('be.visible')
    })
})