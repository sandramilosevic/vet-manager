import { API } from '../../support/api'

describe('Logout', () => {
    // TC-33 - logout clears local tokens and redirects to /login.
    it('clears local tokens and redirects to /login on logout', () => {
        cy.loginAs('/owners')
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

    // TC-34 - the local session is cleared even if the server-side logout
    // call fails, so the user is never trapped in a logged-in UI with a dead token.
    it('still clears the local session even if the logout request fails', () => {
        cy.loginAs('/owners')
        cy.intercept('POST', API.logout, { statusCode: 500 }).as('logoutRequest')
        cy.contains('button', 'Sign out').click()
        cy.get('[data-cy="confirm-dialog-confirm"]').click()
        cy.wait('@logoutRequest')
        cy.url().should('include', '/login')
        cy.window().then((win) => {
            expect(win.localStorage.getItem('vetmanager.access')).to.be.null
        })
    })

    // TC-35 - after logout, protected pages are blocked again, same as
    // for a visitor who was never authenticated.
    it('blocks access to protected pages again after logout', () => {
        cy.loginAs('/owners')
        cy.intercept('POST', API.logout, { statusCode: 200 }).as('logoutRequest')
        cy.contains('button', 'Sign out').click()
        cy.get('[data-cy="confirm-dialog-confirm"]').click()
        cy.wait('@logoutRequest')
        cy.visit('/owners')
        cy.url().should('include', '/login')
    })
})