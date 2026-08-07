import { API } from '../support/api'

describe('Login', () => {
    beforeEach(() => {
        // Open login page and clear previous session
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
        cy.buildFakeJwt({
            user_id: '1',
            role: 'ADMIN',
            email: 'vet@example.com',
            clinic_id: '1',
        }).then((fakeAccessToken) => {
            cy.intercept('POST', API.login, {
                statusCode: 200,
                body: {
                    access: fakeAccessToken,
                    refresh: 'fake-refresh-token',
                },
            }).as('loginRequest')

            cy.intercept('GET', API.me, {
                statusCode: 200,
                body: {
                    id: 1,
                    email: 'vet@example.com',
                    role: 'ADMIN',
                    clinic_name: 'Test Clinic',
                },
            }).as('meRequest')

            cy.get('[data-cy="login-username"]').type('vet@example.com')
            cy.get('[data-cy="login-password"]').type('password-password123')

            cy.get('[data-cy="login-submit"]').click()

            cy.wait('@loginRequest').its('request.body').should('deep.equal', {
                username: 'vet@example.com',
                password: 'password-password123',
            })

            cy.wait('@meRequest')

            cy.url().should('eq', Cypress.config().baseUrl + '/')

            cy.window().then((win) => {
                expect(win.localStorage.getItem('vetmanager.access')).to.eq(fakeAccessToken)
                expect(win.localStorage.getItem('vetmanager.refresh')).to.eq('fake-refresh-token')
            })
        })
    })

    it('shows an error message for invalid credentials', () => {
        cy.intercept('POST', API.login, {
            statusCode: 401,
            body: {
                error: {
                    code: 'AuthenticationFailed',
                    message: 'No active account with the given credentials',
                },
            },
        }).as('loginRequest')

        cy.get('[data-cy="login-username"]').type('vet@example.com')
        cy.get('[data-cy="login-password"]').type('wrong-password')

        cy.get('[data-cy="login-submit"]').click()

        cy.wait('@loginRequest')

        cy.contains('Incorrect username or password.').should('be.visible')

        cy.get('[role="alert"]')
            .should('contain.text', 'Incorrect username or password.')

        cy.url().should('include', '/login')

        cy.get('[data-cy="login-submit"]').should('be.enabled')
    })

    it('disables login after too many failed attempts', () => {
        cy.intercept('POST', API.login, {
            statusCode: 429,
            headers: { 'retry-after': '30' },
            body: {
                error: {
                    code: 'Throttled',
                    message: 'Request was throttled. Expected available in 30 seconds.',
                },
            },
        }).as('loginRequest')

        cy.get('[data-cy="login-username"]').type('vet@example.com')
        cy.get('[data-cy="login-password"]').type('does-not-matter')

        cy.get('[data-cy="login-submit"]').click()

        cy.wait('@loginRequest')

        cy.contains('button', /Try again in \d+s/).should('be.disabled')
        cy.contains('Request was throttled').should('be.visible')
    })
})