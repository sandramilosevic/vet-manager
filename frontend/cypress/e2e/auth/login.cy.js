import { API } from '../../support/api'
import { LoginPage } from '../../pages/LoginPage'
import loginData from '../../fixtures/auth/login.json'

function stubInvalidLogin(alias = 'loginRequest') {
    return cy.intercept('POST', API.login, {
        statusCode: 401,
        fixture: 'auth/login-invalid-credentials.json',
    }).as(alias)
}

describe('Login', () => {
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
        LoginPage.submit()

        cy.contains('Username is required').should('be.visible')
        cy.contains('Password is required').should('be.visible')

        cy.url().should('include', '/login')
    })

    it('shows an error for empty username', () => {
        const { validUser } = loginData

        LoginPage.typePassword(validUser.password)
        LoginPage.submit()

        cy.contains('Username is required').should('be.visible')
        cy.url().should('include', '/login')
    })

    it('shows an error for empty password', () => {
        const { validUser } = loginData

        LoginPage.typeUsername(validUser.username)
        LoginPage.submit()

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

    const rejectedCredentialCases = [
        { key: 'invalidUser', label: 'wrong password for an existing user' },
        { key: 'nonExistentUser', label: 'a username that does not exist' },
        { key: 'caseSensitiveUsername', label: 'username with different casing' },
        { key: 'caseSensitivePassword', label: 'password with different casing' },
        { key: 'leadingSpaceUsername', label: 'leading whitespace in username' },
        { key: 'trailingSpaceUsername', label: 'trailing whitespace in username' },
        { key: 'leadingSpacePassword', label: 'leading whitespace in password' },
        { key: 'trailingSpacePassword', label: 'trailing whitespace in password' },
    ]

    rejectedCredentialCases.forEach(({ key, label }) => {
        it(`rejects login with ${label}`, () => {
            const credentials = loginData[key]

            stubInvalidLogin()
            LoginPage.login(credentials.username, credentials.password)

            cy.wait('@loginRequest')
            cy.contains('Incorrect username or password.').should('be.visible')
            LoginPage.errorBanner().should('contain.text', 'Incorrect username or password.')

            cy.url().should('include', '/login')
            LoginPage.submitButton().should('be.enabled')
        })
    })

    it('shows an error for whitespace-only username', () => {
        const { whitespaceOnlyUsername } = loginData

        LoginPage.typeUsername(whitespaceOnlyUsername.username)
        LoginPage.typePassword(whitespaceOnlyUsername.password)
        LoginPage.submit()

        cy.contains('Username is required').should('be.visible')
        cy.url().should('include', '/login')
    })

    it('sends a whitespace-only password to the server as a literal value', () => {
        const { whitespaceOnlyPassword } = loginData

        stubInvalidLogin()
        LoginPage.login(whitespaceOnlyPassword.username, whitespaceOnlyPassword.password)

        cy.wait('@loginRequest').its('request.body').should('deep.equal', whitespaceOnlyPassword)
        cy.contains('Incorrect username or password.').should('be.visible')
        cy.url().should('include', '/login')
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

    it('safely handles a SQL injection attempt without crashing or bypassing auth', () => {
        const { sqlInjectionAttempt } = loginData

        stubInvalidLogin()
        LoginPage.login(sqlInjectionAttempt.username, sqlInjectionAttempt.password)

        cy.wait('@loginRequest').its('request.body').should('deep.equal', sqlInjectionAttempt)

        cy.contains('Incorrect username or password.').should('be.visible')
        cy.url().should('include', '/login')
        LoginPage.submitButton().should('be.enabled')
    })

    it('safely handles an XSS attempt without executing the script', () => {
        const { xssAttempt } = loginData

        stubInvalidLogin()
        LoginPage.login(xssAttempt.username, xssAttempt.password)

        cy.wait('@loginRequest').its('request.body').should('deep.equal', xssAttempt)

        cy.get('script').each(($script) => {
            expect($script.text()).not.to.include("alert('xss')")
        })
        cy.contains('Incorrect username or password.').should('be.visible')
        cy.url().should('include', '/login')
    })

    it('shows the same generic error for a disabled account as for wrong credentials', () => {
        const { validUser } = loginData

        stubInvalidLogin()
        LoginPage.login(validUser.username, validUser.password)

        cy.wait('@loginRequest')
        cy.contains('Incorrect username or password.').should('be.visible')
        cy.url().should('include', '/login')
        LoginPage.submitButton().should('be.enabled')
    })

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
            LoginPage.usernameInput().should('have.attr', 'aria-required', 'true')
            LoginPage.passwordInput().should('have.attr', 'aria-required', 'true')
        })

        it('keeps every control natively focusable in logical DOM order', () => {
            LoginPage.usernameInput().should('be.visible').focus().should('be.focused')
            LoginPage.passwordInput().should('be.visible').focus().should('be.focused')
            LoginPage.submitButton().should('be.visible').focus().should('be.focused')
        })

        it('exposes the login error to assistive tech via role="alert"', () => {
            stubInvalidLogin()
            LoginPage.login('vet@example.com', 'wrong-password')
            cy.wait('@loginRequest')

            LoginPage.errorBanner().should('exist').and('be.visible')
        })
    })
})