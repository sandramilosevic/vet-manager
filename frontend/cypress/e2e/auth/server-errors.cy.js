import { API } from '../../support/api'
import loginData from '../../fixtures/auth/login.json'
import { LoginPage } from '../../pages/LoginPage'

describe('Server error handling on login', () => {
    beforeEach(() => {
        LoginPage.visit()
    })

    // TC-36 — the request never reaches the server at all (offline, DNS
    // failure, CORS rejection). normalizeError() has no error.response to
    // read, so it falls back to the generic "can't reach the server" copy.
    it('shows a network-error message when the API cannot be reached', () => {
        const { validUser } = loginData

        cy.intercept('POST', API.login, { forceNetworkError: true }).as('loginRequest')

        LoginPage.login(validUser.username, validUser.password)

        cy.wait('@loginRequest')
        cy.contains('Cannot reach the server. Check your connection and that the API is running.')
            .should('be.visible')
        cy.url().should('include', '/login')
        LoginPage.submitButton().should('be.enabled')
    })

    // TC-37 — the request hangs past the client's 20s axios timeout, which
    // surfaces as error.code === 'ECONNABORTED' with no response.
    it('shows a timeout message when the request takes too long', () => {
        const { validUser } = loginData

        cy.intercept('POST', API.login, (req) => {
            req.reply({ delay: 21_000, statusCode: 200, body: {} })
        }).as('loginRequest')

        LoginPage.login(validUser.username, validUser.password)

        cy.wait('@loginRequest', { timeout: 25_000 })
        cy.contains('The request timed out.', { timeout: 25_000 }).should('be.visible')
        cy.url().should('include', '/login')
        LoginPage.submitButton().should('be.enabled')
    })

    // TC-38 — the server responds, but with a 500 and no useful body, so
    // normalizeError() falls back to its status-specific 5xx message.
    it('shows a generic server-error message on a 500 response', () => {
        const { validUser } = loginData

        cy.intercept('POST', API.login, { statusCode: 500, body: {} }).as('loginRequest')

        LoginPage.login(validUser.username, validUser.password)

        cy.wait('@loginRequest')
        cy.contains('The server encountered an error. Please try again.').should('be.visible')
        cy.url().should('include', '/login')
        LoginPage.submitButton().should('be.enabled')
    })

    // TC-39 — the form stays usable after a server error: nothing is left
    // disabled or stuck, and a retry against a healthy backend succeeds.
    it('lets the user retry successfully after a server error clears', () => {
        const { validUser, jwtPayload } = loginData

        cy.intercept('POST', API.login, { statusCode: 500, body: {} }).as('failedLogin')
        LoginPage.login(validUser.username, validUser.password)
        cy.wait('@failedLogin')
        cy.contains('The server encountered an error. Please try again.').should('be.visible')

        cy.buildFakeJwt(jwtPayload).then((fakeAccessToken) => {
            cy.intercept('POST', API.login, {
                statusCode: 200,
                body: { access: fakeAccessToken, refresh: 'fake-refresh-token' },
            }).as('retryLogin')
            cy.intercept('GET', API.me, {
                statusCode: 200,
                fixture: 'auth/login-me-response.json',
            }).as('meRequest')

            LoginPage.submitButton().should('be.enabled')
            LoginPage.submit()

            cy.wait('@retryLogin')
            cy.wait('@meRequest')

            cy.url().should('eq', Cypress.config().baseUrl + '/')
        })
    })
})