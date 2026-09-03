import { API } from '../../support/api'
import ownerList from '../../fixtures/owners/owners-list.json'

describe('Route protection', () => {
    // TC-30 — unauthenticated users are bounced to /login and the app
    // remembers where they were headed so login can send them back.
    it('redirects an unauthenticated visitor from a protected page to /login', () => {
        cy.visitClean('/owners')

        cy.url().should('include', '/login')
        cy.get('[data-cy="login-username"]').should('be.visible')
    })

    it('returns an unauthenticated visitor to the page they originally requested after signing in', () => {
        cy.visitClean('/owners')
        cy.url().should('include', '/login')

        cy.intercept('GET', API.owners, { statusCode: 200, body: ownerList }).as('ownersRequest')
        cy.intercept('GET', API.me, {
            statusCode: 200,
            fixture: 'auth/login-me-response.json',
        }).as('meRequest')

        cy.fixture('auth/login.json').then(({ validUser, jwtPayload }) => {
            cy.buildFakeJwt(jwtPayload).then((fakeAccessToken) => {
                cy.intercept('POST', API.login, {
                    statusCode: 200,
                    body: { access: fakeAccessToken, refresh: 'fake-refresh-token' },
                }).as('loginRequest')

                cy.get('[data-cy="login-username"]').type(validUser.username)
                cy.get('[data-cy="login-password"]').type(validUser.password)
                cy.get('[data-cy="login-submit"]').click()

                cy.wait('@loginRequest')
                cy.wait('@meRequest')
                cy.wait('@ownersRequest')

                cy.url().should('include', '/owners')
            })
        })
    })

    // TC-31 — a role that isn't allowed on a route sees the cosmetic
    // "no access" guard instead of the page content. The real boundary is
    // the backend's permission classes; this only checks the UI hides it.
    it('blocks a role that is not allowed on a role-restricted route', () => {
        cy.loginAs('/staff', { role: 'STAFF' })

        cy.contains("You don't have access to this page").should('be.visible')
        cy.contains('This area is limited to ADMIN').should('be.visible')
        cy.get('[data-cy="staff-list"]').should('not.exist')
    })

    it('allows a role that is permitted on a role-restricted route', () => {
        cy.intercept('GET', '**/api/v1/accounts/**', { statusCode: 200, body: { count: 0, results: [] } }).as('staffRequest')

        cy.loginAs('/staff', { role: 'ADMIN' })

        cy.contains("You don't have access to this page").should('not.exist')
    })

    // TC-32 — an already-authenticated user shouldn't be able to land back
    // on the login screen; they get redirected to the dashboard instead.
    it('redirects an already-authenticated user away from /login', () => {
        cy.loginAs('/')
        cy.visit('/login')

        cy.url().should('eq', Cypress.config().baseUrl + '/')
        cy.get('[data-cy="login-username"]').should('not.exist')
    })
})