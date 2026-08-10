import { API } from '../support/api'
import loginData from '../fixtures/auth/login.json'

describe('Login', () => {
    // visitClean wipes storage before the app's JS runs, so a leftover
    // token from a previous test can't auto-redirect us away from /login
    // before the test even gets a chance to assert anything.
    beforeEach(() => {
        cy.visitClean('/login')
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
        // No intercept here on purpose: this is purely client-side (zod/RHF)
        // validation, so nothing should ever hit the network.
        cy.get('[data-cy="login-submit"]').click()

        cy.contains('Username is required').should('be.visible')
        cy.contains('Password is required').should('be.visible')

        cy.url().should('include', '/login')
    })

    it('logs in successfully, stores tokens, and redirects to the dashboard', () => {
        const { validUser, jwtPayload } = loginData

        // buildFakeJwt fabricates a well-formed (but unsigned) JWT so the
        // app's token-parsing logic has something realistic to decode,
        // without needing a real backend to issue one.
        cy.buildFakeJwt(jwtPayload).then((fakeAccessToken) => {
            cy.intercept('POST', API.login, {
                statusCode: 200,
                body: {
                    access: fakeAccessToken,
                    refresh: 'fake-refresh-token',
                },
            }).as('loginRequest')

            // The app calls /me right after login to hydrate the user's
            // profile — stub it too, or the post-login flow stalls waiting
            // on a real request.
            cy.intercept('GET', API.me, {
                statusCode: 200,
                fixture: 'login-me-response.json',
            }).as('meRequest')

            cy.get('[data-cy="login-username"]').type(validUser.username)
            cy.get('[data-cy="login-password"]').type(validUser.password)

            cy.get('[data-cy="login-submit"]').click()

            // Confirms the exact payload sent to the backend, not just that
            // "a" request fired.
            cy.wait('@loginRequest').its('request.body').should('deep.equal', validUser)

            cy.wait('@meRequest')

            cy.url().should('eq', Cypress.config().baseUrl + '/')

            // Verifies the tokens actually landed in localStorage under the
            // keys the app is expected to use — this is what auth persistence
            // across page reloads depends on.
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

        // Checked twice deliberately: cy.contains proves the text is
        // somewhere on the page, [role="alert"] proves it's exposed to
        // assistive tech the way an error message should be.
        cy.get('[role="alert"]')
            .should('contain.text', 'Incorrect username or password.')

        cy.url().should('include', '/login')

        // A failed login must not leave the form stuck in a disabled/loading
        // state — the user needs to be able to try again immediately.
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
        // Password value is irrelevant here — throttling happens before
        // credentials are even checked, so any string will trigger it.
        cy.get('[data-cy="login-password"]').type('does-not-matter')

        cy.get('[data-cy="login-submit"]').click()

        // Shared with forgot-password.cy.js / reset-password.cy.js so the
        // 429 UI contract (disabled button + countdown + message) is
        // asserted in exactly one place.
        cy.expectThrottled('loginRequest')
    })
})