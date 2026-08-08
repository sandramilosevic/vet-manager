import { API } from '../support/api'
import loginData from '../fixtures/login.json'

describe('Login', () => {
    beforeEach(() => {
        cy.visit('/login')
        cy.clearLocalStorage()
    })

    it('displays the login form correctly', () => {
        cy.contains('h1', 'Sign in').should('be.visible')

        cy.get('[data-cy="login-username"]').should('be.visible')
        cy.get('[data-cy="login-password"]')
            .should('be.visible')
            .and('have.attr', 'type', 'password')

        cy.get('[data-cy="login-submit"]').should('be.enabled').and('contain', 'Sign in')
        cy.get('[data-cy="forgot-password-link"]').should('have.attr', 'href', '/forgot-password')
    })

    it('shows validation errors when submitting an empty form', () => {
        cy.get('[data-cy="login-submit"]').click()

        cy.contains('Username is required').should('be.visible')
        cy.contains('Password is required').should('be.visible')

        cy.url().should('include', '/login')
    })

    it('logs in successfully, stores tokens, and redirects to the dashboard', () => {
        const { validUser, jwtPayload } = loginData

        cy.buildFakeJwt(jwtPayload).then((fakeAccessToken) => {
            cy.intercept('POST', API.login, {
                statusCode: 200,
                body: {
                    access: fakeAccessToken,
                    refresh: 'fake-refresh-token',
                },
            }).as('loginRequest')

            cy.intercept('GET', API.me, {
                statusCode: 200,
                fixture: 'login-me-response.json',
            }).as('meRequest')

            cy.get('[data-cy="login-username"]').type(validUser.username)
            cy.get('[data-cy="login-password"]').type(validUser.password)

            cy.get('[data-cy="login-submit"]').click()

            cy.wait('@loginRequest').its('request.body').should('deep.equal', validUser)

            cy.wait('@meRequest')

            cy.url().should('eq', Cypress.config().baseUrl + '/')

            cy.window().then((win) => {
                expect(win.localStorage.getItem('vetmanager.access')).to.eq(fakeAccessToken)
                expect(win.localStorage.getItem('vetmanager.refresh')).to.eq('fake-refresh-token')
            })
        })
    })

    it('shows an error message for invalid credentials', () => {
        const { invalidUser } = loginData

        cy.intercept('POST', API.login, {
            statusCode: 401,
            fixture: 'login-invalid-credentials.json',
        }).as('loginRequest')

        cy.get('[data-cy="login-username"]').type(invalidUser.username)
        cy.get('[data-cy="login-password"]').type(invalidUser.password)

        cy.get('[data-cy="login-submit"]').click()

        cy.wait('@loginRequest')

        cy.contains('Incorrect username or password.').should('be.visible')

        cy.get('[role="alert"]')
            .should('contain.text', 'Incorrect username or password.')

        cy.url().should('include', '/login')

        cy.get('[data-cy="login-submit"]').should('be.enabled')
    })

    it('disables login after too many failed attempts', () => {
        const { validUser } = loginData

        cy.intercept('POST', API.login, {
            statusCode: 429,
            headers: { 'retry-after': '30' },
            fixture: 'throttled-error.json',
        }).as('loginRequest')

        cy.get('[data-cy="login-username"]').type(validUser.username)
        cy.get('[data-cy="login-password"]').type('does-not-matter')

        cy.get('[data-cy="login-submit"]').click()

        cy.wait('@loginRequest')

        cy.contains('button', /Try again in \d+s/).should('be.disabled')
        cy.contains('Request was throttled').should('be.visible')
    })
})