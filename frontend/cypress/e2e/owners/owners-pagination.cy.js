import { API } from '../../support/api'
import ownerList from '../../fixtures/owners/owners-list.json'

// Generates a given number of mock owners, used for pagination scenarios
// where the exact content doesn't matter, only the count and shape.
const generateOwners = (count, startId = 1) => {
    return Array.from({ length: count }, (_, i) => {
        const id = startId + i
        return {
            id,
            first_name: `First${id}`,
            last_name: `Last${id}`,
            email: `owner${id}@example.com`,
            phone_number: '+15550000000',
            address: '123 Main St',
            registration_date: '2026-01-01',
        }
    })
}

const PAGE_SIZE = 15

describe('Owners list pagination', () => {
    beforeEach(() => {
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: ownerList,
        }).as('ownersRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest')
    })

    it('shows only 15 owners on the first page when there are more', () => {
        const owners = generateOwners(20)

        cy.intercept('GET', API.owners, (req) => {
            if (!req.query.page || req.query.page === '1') {
                req.alias = 'firstPage'
                req.reply({
                    statusCode: 200,
                    body: {
                        count: 20,
                        next: `${API.owners}?page=2`,
                        previous: null,
                        results: owners.slice(0, PAGE_SIZE),
                    },
                })
            }
        })

        cy.reload()
        cy.wait('@firstPage')

        cy.get('[data-cy="owner-row"]').should('have.length', PAGE_SIZE)
        cy.get('[data-cy="pagination-next"]').should('be.visible').and('not.be.disabled')
        cy.get('[data-cy="pagination-previous"]').should('be.disabled')
    })

    it('requests the second page and shows the remaining owners when next is clicked', () => {
        const owners = generateOwners(20)

        cy.intercept('GET', API.owners, (req) => {
            if (!req.query.page || req.query.page === '1') {
                req.alias = 'firstPage'
                req.reply({
                    statusCode: 200,
                    body: {
                        count: 20,
                        next: `${API.owners}?page=2`,
                        previous: null,
                        results: owners.slice(0, PAGE_SIZE),
                    },
                })
            }

            if (req.query.page === '2') {
                req.alias = 'secondPage'
                req.reply({
                    statusCode: 200,
                    body: {
                        count: 20,
                        next: null,
                        previous: `${API.owners}?page=1`,
                        results: owners.slice(PAGE_SIZE, 20),
                    },
                })
            }
        })

        cy.reload()
        cy.wait('@firstPage')

        cy.get('[data-cy="pagination-next"]').click()

        cy.wait('@secondPage')
            .its('request.query')
            .should('include', { page: '2' })

        cy.get('[data-cy="owner-row"]').should('have.length', 20 - PAGE_SIZE)
    })

    it('disables the next button on the last page', () => {
        const owners = generateOwners(20)

        cy.intercept('GET', API.owners, (req) => {
            if (!req.query.page || req.query.page === '1') {
                req.alias = 'firstPage'
                req.reply({
                    statusCode: 200,
                    body: {
                        count: 20,
                        next: `${API.owners}?page=2`,
                        previous: null,
                        results: owners.slice(0, PAGE_SIZE),
                    },
                })
            }

            if (req.query.page === '2') {
                req.alias = 'secondPage'
                req.reply({
                    statusCode: 200,
                    body: {
                        count: 20,
                        next: null,
                        previous: `${API.owners}?page=1`,
                        results: owners.slice(PAGE_SIZE, 20),
                    },
                })
            }
        })

        cy.reload()
        cy.wait('@firstPage')

        cy.get('[data-cy="pagination-next"]').click()
        cy.wait('@secondPage')

        cy.get('[data-cy="pagination-next"]').should('be.disabled')
        cy.get('[data-cy="pagination-previous"]').should('not.be.disabled')
    })

    it('requests the previous page when previous is clicked', () => {
        const owners = generateOwners(20)

        cy.intercept('GET', API.owners, (req) => {
            if (!req.query.page || req.query.page === '1') {
                req.alias = 'firstPage'
                req.reply({
                    statusCode: 200,
                    body: {
                        count: 20,
                        next: `${API.owners}?page=2`,
                        previous: null,
                        results: owners.slice(0, PAGE_SIZE),
                    },
                })
            }

            if (req.query.page === '2') {
                req.alias = 'secondPage'
                req.reply({
                    statusCode: 200,
                    body: {
                        count: 20,
                        next: null,
                        previous: `${API.owners}?page=1`,
                        results: owners.slice(PAGE_SIZE, 20),
                    },
                })
            }

            if (req.query.page === '1' && req.alias === undefined) {
                req.alias = 'backToFirstPage'
            }
        })

        cy.reload()
        cy.wait('@firstPage')

        cy.get('[data-cy="pagination-next"]').click()
        cy.wait('@secondPage')

        cy.get('[data-cy="pagination-previous"]').click()

        cy.wait('@backToFirstPage')
            .its('request.query')
            .should('include', { page: '1' })

        cy.get('[data-cy="owner-row"]').should('have.length', PAGE_SIZE)
    })

    it('does not show pagination controls when all owners fit on one page', () => {
        const owners = generateOwners(10)

        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: {
                count: 10,
                next: null,
                previous: null,
                results: owners,
            },
        }).as('singlePage')

        cy.reload()
        cy.wait('@singlePage')

        cy.get('[data-cy="owner-row"]').should('have.length', 10)
        cy.get('[data-cy="pagination-next"]').should('not.exist')
        cy.get('[data-cy="pagination-previous"]').should('not.exist')
    })

    it('resets to the first page when a filter is applied', () => {
        const owners = generateOwners(20)

        cy.intercept('GET', API.owners, (req) => {
            if (!req.query.page || req.query.page === '1') {
                req.alias = 'firstPage'
                req.reply({
                    statusCode: 200,
                    body: {
                        count: 20,
                        next: `${API.owners}?page=2`,
                        previous: null,
                        results: owners.slice(0, PAGE_SIZE),
                    },
                })
            }

            if (req.query.page === '2') {
                req.alias = 'secondPage'
                req.reply({
                    statusCode: 200,
                    body: {
                        count: 20,
                        next: null,
                        previous: `${API.owners}?page=1`,
                        results: owners.slice(PAGE_SIZE, 20),
                    },
                })
            }

            if (req.query.last_name__icontains === 'Last1') {
                req.alias = 'filteredRequest'
            }
        })

        cy.reload()
        cy.wait('@firstPage')

        cy.get('[data-cy="pagination-next"]').click()
        cy.wait('@secondPage')

        cy.get('#filter-last-name').type('Last1')

        cy.wait('@filteredRequest')
            .its('request.query')
            .should('include', { page: '1', last_name__icontains: 'Last1' })
    })
})