import { API } from '../../support/api'
import ownerList from '../../fixtures/owners/owners-list.json'

describe('Logout', () => {
    beforeEach(() => {
        cy.viewport(1280, 800)
        cy.intercept('GET', API.owners, { statusCode: 200, body: ownerList }).as('ownersRequest')
    })

    it('clears local tokens and redirects to /login on logout', () => {
        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        cy.intercept('POST', API.logout, { statusCode: 200 }).as('logoutRequest')

        cy.contains('button', 'Sign out').click()
        cy.get('[data-cy="confirm-dialog-confirm"]').click()

        cy.wait('@logoutRequest')
            .its('request.body')
            .should('deep.equal', { refresh: 'fake-refresh-token' })

        cy.url().should('include', '/login')

        cy.window().then((win) => {
            expect(win.localStorage.getItem('vetmanager.access')).to.be.null
            expect(win.localStorage.getItem('vetmanager.refresh')).to.be.null
        })
    })

    it('still clears the local session even if the logout request fails', () => {
        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        cy.intercept('POST', API.logout, { statusCode: 500 }).as('logoutRequest')

        cy.contains('button', 'Sign out').click()
        cy.get('[data-cy="confirm-dialog-confirm"]').click()

        cy.wait('@logoutRequest')
        cy.url().should('include', '/login')

        cy.window().then((win) => {
            expect(win.localStorage.getItem('vetmanager.access')).to.be.null
        })
    })

    it('blocks access to protected pages again after logout', () => {
        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        cy.intercept('POST', API.logout, { statusCode: 200 }).as('logoutRequest')

        cy.contains('button', 'Sign out').click()
        cy.get('[data-cy="confirm-dialog-confirm"]').click()
        cy.wait('@logoutRequest')

        cy.visit('/owners')
        cy.url().should('include', '/login')
    })
})