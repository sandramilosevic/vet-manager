import { API } from '../../support/api'
import ownerList from '../../fixtures/owners/owners-list.json'
import { generateOwners } from '../../support/utils/generate-owners'
import { OwnersPage } from '../../pages/OwnersPage'

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

        OwnersPage.ownerRows().should('have.length', PAGE_SIZE)

        OwnersPage.paginationNext()
            .should('be.visible')
            .and('not.be.disabled')

        OwnersPage.paginationPrevious()
            .should('be.disabled')
    })

    it('requests the second page and shows the remaining owners when next is clicked', () => {
        const owners = generateOwners(20)

        interceptPaginatedOwners(owners)

        cy.reload()
        cy.wait('@firstPage')

        OwnersPage.paginationNext().click()

        cy.wait('@secondPage')
            .its('request.query')
            .should('include', { page: '2' })

        OwnersPage.ownerRows().should('have.length', 5)
    })

    it('disables the next button on the last page', () => {
        const owners = generateOwners(20)

        interceptPaginatedOwners(owners)

        cy.reload()
        cy.wait('@firstPage')

        OwnersPage.paginationNext().click()

        cy.wait('@secondPage')

        OwnersPage.paginationNext()
            .should('be.disabled')

        OwnersPage.paginationPrevious()
            .should('not.be.disabled')
    })

    it('requests the previous page when previous is clicked', () => {
        const owners = generateOwners(20)

        interceptPaginatedOwners(owners)

        cy.reload()
        cy.wait('@firstPage')

        OwnersPage.paginationNext().click()
        cy.wait('@secondPage')

        OwnersPage.paginationPrevious().click()

        cy.wait('@firstPage')
            .its('request.query')
            .should('include', { page: '1' })

        OwnersPage.ownerRows().should('have.length', PAGE_SIZE)
    })

    it('does not show pagination controls when all owners fit on one page', () => {
        const owners = generateOwners(10)

        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: {
                count: owners.length,
                next: null,
                previous: null,
                results: owners,
            },
        }).as('singlePage')

        cy.reload()
        cy.wait('@singlePage')

        OwnersPage.ownerRows().should('have.length', owners.length)

        OwnersPage.paginationNext().should('not.exist')
        OwnersPage.paginationPrevious().should('not.exist')
    })

    it('resets to the first page when a filter is applied', () => {
        const owners = generateOwners(20)

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

                return
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

                return
            }

            if (req.query.last_name__icontains === 'Last1') {
                req.alias = 'filteredRequest'

                req.reply({
                    statusCode: 200,
                    body: {
                        count: 11,
                        next: null,
                        previous: null,
                        results: owners.filter((owner) =>
                            owner.last_name.includes('Last1'),
                        ),
                    },
                })
            }
        })

        cy.reload()
        cy.wait('@firstPage')

        OwnersPage.paginationNext().click()
        cy.wait('@secondPage')

        OwnersPage.typeFilterLastName('Last1')

        cy.wait('@filteredRequest')
            .its('request.query')
            .should('include', {
                page: '1',
                last_name__icontains: 'Last1',
            })

        OwnersPage.ownerRows().should('have.length', 11)
    })
})