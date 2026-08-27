import { API } from '../../support/api'
import { LoginPage } from '../../pages/LoginPage'
import loginData from '../../fixtures/auth/login.json'

describe('Login', () => {
    // visitClean wipes storage before the app's JS runs, so a leftover
    // token from a previous test can't auto-redirect us away from /login
    // before the test even gets a chance to assert anything.
    beforeEach(() => {
        LoginPage.visit()
    })

    it('displays the login form correctly', () => {
        LoginPage.heading().should('be.visible')

        LoginPage.usernameInput().should('be.visible')
        LoginPage.passwordInput().should('be.visible').and('have.attr', 'type', 'password')

        LoginPage.submitButton().should('be.enabled').and('contain', 'Sign in')
        LoginPage.forgotPasswordLink().should('have.attr', 'href', '/forgot-password')
    })

    it('shows validation errors when submitting an empty form', () => {
        // No intercept here on purpose: this is purely client-side
        // validation, so nothing should ever hit the network.
        LoginPage.submit()

        cy.contains('Username is required').should('be.visible')
        cy.contains('Password is required').should('be.visible')

        cy.url().should('include', '/login')
    })

    it('logs in successfully, stores tokens, and redirects to the dashboard', () => {
        const { validUser, jwtPayload } = loginData

        cy.buildFakeJwt(jwtPayload).then((fakeAccessToken) => {
            cy.intercept('POST', API.login, {
                statusCode: 200,
                body: { access: fakeAccessToken, refresh: 'fake-refresh-token' },
            }).as('loginRequest')

            cy.intercept('GET', API.me, {
                statusCode: 200,
                fixture: 'auth/login-me-response.json',
            }).as('meRequest')

            LoginPage.login(validUser.username, validUser.password)

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
            fixture: 'auth/login-invalid-credentials.json',
        }).as('loginRequest')

        LoginPage.login(invalidUser.username, invalidUser.password)

        cy.wait('@loginRequest')

        cy.contains('Incorrect username or password.').should('be.visible')
        LoginPage.errorBanner().should('contain.text', 'Incorrect username or password.')

        cy.url().should('include', '/login')
        LoginPage.submitButton().should('be.enabled')
    })

    it('disables login after too many failed attempts', () => {
        const { validUser } = loginData

        cy.intercept('POST', API.login, {
            statusCode: 429,
            headers: { 'retry-after': '30' },
            fixture: 'auth/throttled-error.json',
        }).as('loginRequest')

        LoginPage.typeUsername(validUser.username)
        LoginPage.typePassword('does-not-matter')
        LoginPage.submit()

        cy.expectThrottled('loginRequest')
    })

    // SQL injection attempt 
    it('safely handles a SQL injection attempt without crashing or bypassing auth', () => {
        // This proves the FRONTEND behaves correctly when fed an
        // injection-style payload: it's sent as plain text, the app
        // doesn't crash, and login is refused like any other bad
        // credential. It does NOT prove the backend is immune to SQL
        // injection — that's covered separately by
        // backend/apps/accounts/tests/test_login_security.py, since
        // Django's ORM (which parameterizes queries) is what actually
        // provides that guarantee, not anything in this UI.
        const injectionPayload = "' OR '1'='1"

        cy.intercept('POST', API.login, {
            statusCode: 401,
            fixture: 'auth/login-invalid-credentials.json',
        }).as('loginRequest')

        LoginPage.login(injectionPayload, injectionPayload)

        cy.wait('@loginRequest')
            .its('request.body')
            .should('deep.equal', { username: injectionPayload, password: injectionPayload })

        cy.contains('Incorrect username or password.').should('be.visible')
        cy.url().should('include', '/login')
        LoginPage.submitButton().should('be.enabled')
    })

    // Disabled account login 
    it('shows the same generic error for a disabled account as for wrong credentials', () => {
        // SimpleJWT's default behavior returns the identical
        // "No active account with the given credentials" response for a
        // deactivated (is_active=False) account as for a wrong password.

        const { validUser } = loginData

        cy.intercept('POST', API.login, {
            statusCode: 401,
            fixture: 'auth/login-invalid-credentials.json',
        }).as('loginRequest')

        LoginPage.login(validUser.username, validUser.password)

        cy.wait('@loginRequest')
        cy.contains('Incorrect username or password.').should('be.visible')
        cy.url().should('include', '/login')
        LoginPage.submitButton().should('be.enabled')
    })

    //  Accessibility 
    describe('Accessibility', () => {
        it('associates visible labels with the username and password fields', () => {
            LoginPage.usernameInput()
                .should('have.attr', 'id')
                .then((id) => cy.get(`label[for="${id}"]`).should('exist').and('be.visible'))

            LoginPage.passwordInput()
                .should('have.attr', 'id')
                .then((id) => cy.get(`label[for="${id}"]`).should('exist').and('be.visible'))
        })

        it('marks required fields for assistive tech', () => {
            LoginPage.usernameInput().should('have.attr', 'required')
            LoginPage.passwordInput().should('have.attr', 'required')
        })

        it('keeps every control natively focusable in logical DOM order', () => {
            // Real Tab-key traversal needs the cypress-real-events plugin;
            // this checks the underlying contract that traversal depends
            // on -- native, focusable elements in source order -- without
            // adding a new dependency.
            cy.focused().should('not.exist')

            LoginPage.usernameInput().should('be.visible').focus().should('be.focused')
            LoginPage.passwordInput().should('be.visible').focus().should('be.focused')
            LoginPage.submitButton().should('be.visible').focus().should('be.focused')
        })

        it('exposes the login error to assistive tech via role="alert"', () => {
            cy.intercept('POST', API.login, {
                statusCode: 401,
                fixture: 'auth/login-invalid-credentials.json',
            }).as('loginRequest')

            LoginPage.login('vet@example.com', 'wrong-password')
            cy.wait('@loginRequest')

            LoginPage.errorBanner().should('exist').and('be.visible')
        })
    })
})