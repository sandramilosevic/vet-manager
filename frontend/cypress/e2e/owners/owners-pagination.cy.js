import { API } from '../../support/api'
import ownerList from '../../fixtures/owners/owners-list.json'
import { generateOwners } from '../../support/utils/generate-owners'

const PAGE_SIZE = 15

const interceptPaginatedOwners = (owners) => {
    cy.intercept('GET', API.owners, (req) => {
        if (!req.query.page || req.query.page === '1') {
            req.alias = 'firstPage'

            req.reply({
                statusCode: 200,
                body: {
                    count: owners.length,
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
                    count: owners.length,
                    next: null,
                    previous: `${API.owners}?page=1`,
                    results: owners.slice(PAGE_SIZE),
                },
            })
        }
    })
}

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

        interceptPaginatedOwners(owners)

        cy.reload()
        cy.wait('@firstPage')

        cy.get('[data-cy="owner-row"]')
            .should('have.length', PAGE_SIZE)

        cy.get('[data-cy="pagination-next"]')
            .should('be.visible')
            .and('not.be.disabled')

        cy.get('[data-cy="pagination-previous"]')
            .should('be.disabled')
    })

    it('requests the second page and shows the remaining owners when next is clicked', () => {
        const owners = generateOwners(20)

        interceptPaginatedOwners(owners)

        cy.reload()
        cy.wait('@firstPage')

        cy.get('[data-cy="pagination-next"]').click()

        cy.wait('@secondPage')
            .its('request.query')
            .should('include', { page: '2' })

        cy.get('[data-cy="owner-row"]')
            .should('have.length', 5)
    })

    it('disables the next button on the last page', () => {
        const owners = generateOwners(20)

        interceptPaginatedOwners(owners)

        cy.reload()
        cy.wait('@firstPage')

        cy.get('[data-cy="pagination-next"]').click()

        cy.wait('@secondPage')

        cy.get('[data-cy="pagination-next"]')
            .should('be.disabled')

        cy.get('[data-cy="pagination-previous"]')
            .should('not.be.disabled')
    })

    it('requests the previous page when previous is clicked', () => {
        const owners = generateOwners(20)

        interceptPaginatedOwners(owners)

        cy.reload()
        cy.wait('@firstPage')

        cy.get('[data-cy="pagination-next"]').click()
        cy.wait('@secondPage')

        cy.get('[data-cy="pagination-previous"]').click()

        cy.wait('@firstPage')
            .its('request.query')
            .should('include', { page: '1' })

        cy.get('[data-cy="owner-row"]')
            .should('have.length', PAGE_SIZE)
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

        cy.get('[data-cy="owner-row"]')
            .should('have.length', 10)

        cy.get('[data-cy="pagination-next"]')
            .should('not.exist')

        cy.get('[data-cy="pagination-previous"]')
            .should('not.exist')
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
                        results: owners.slice(PAGE_SIZE),
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
            .should('include', {
                page: '1',
                last_name__icontains: 'Last1',
            })
    })
})