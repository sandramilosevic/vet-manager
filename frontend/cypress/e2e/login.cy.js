describe('Login', () => {
    beforeEach(() => {
        // Open login page and clear previous session
        cy.visit('/login')
        cy.clearLocalStorage()
    })

    it('displays the login form correctly', () => {
        // Verify all required login elements are visible
        cy.contains('h1', 'Sign in').should('be.visible')

        cy.get('input[name="username"]').should('be.visible')
        cy.get('input[name="password"]')
            .should('be.visible')
            .and('have.attr', 'type', 'password')

        cy.contains('button', 'Sign in').should('be.enabled')
        cy.contains('a', 'Forgot your password?')
            .should('have.attr', 'href', '/forgot-password')
    })

    it('shows validation errors when submitting an empty form', () => {
        // Submit without entering credentials
        cy.contains('button', 'Sign in').click()

        cy.contains('Username is required').should('be.visible')
        cy.contains('Password is required').should('be.visible')

        cy.url().should('include', '/login')
    })

    it('logs in successfully, stores tokens, and redirects to the dashboard', () => {
        // Mock successful authentication
        cy.buildFakeJwt({
            user_id: '1',
            role: 'ADMIN',
            email: 'vet@example.com',
            clinic_id: '1',
        }).then((fakeAccessToken) => {
            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 200,
                body: {
                    access: fakeAccessToken,
                    refresh: 'fake-refresh-token',
                },
            }).as('loginRequest')

            cy.intercept('GET', '**/api/v1/accounts/me/', {
                statusCode: 200,
                body: {
                    id: 1,
                    email: 'vet@example.com',
                    role: 'ADMIN',
                    clinic_name: 'Test Clinic',
                },
            }).as('meRequest')

            cy.get('input[name="username"]').type('vet@example.com')
            cy.get('input[name="password"]').type('password-password123')

            cy.contains('button', 'Sign in').click()

            // Verify request payload
            cy.wait('@loginRequest').its('request.body').should('deep.equal', {
                username: 'vet@example.com',
                password: 'password-password123',
            })

            cy.wait('@meRequest')

            // Verify redirect after successful login
            cy.url().should('eq', Cypress.config().baseUrl + '/')

            // Verify tokens are stored
            cy.window().then((win) => {
                expect(win.localStorage.getItem('vetmanager.access')).to.eq(fakeAccessToken)
                expect(win.localStorage.getItem('vetmanager.refresh')).to.eq('fake-refresh-token')
            })
        })
    })

    it('shows an error message for invalid credentials', () => {
        // Mock failed authentication
        cy.intercept('POST', '**/api/v1/auth/login/', {
            statusCode: 401,
            body: {
                error: {
                    code: 'AuthenticationFailed',
                    message: 'No active account with the given credentials',
                },
            },
        }).as('loginRequest')

        cy.get('input[name="username"]').type('vet@example.com')
        cy.get('input[name="password"]').type('wrong-password')

        cy.contains('button', 'Sign in').click()

        cy.wait('@loginRequest')

        // Verify error feedback
        cy.contains('Incorrect username or password.').should('be.visible')

        cy.get('[role="alert"]')
            .should('contain.text', 'Incorrect username or password.')

        cy.url().should('include', '/login')

        cy.contains('button', 'Sign in').should('be.enabled')
    })

    it('disables login after too many failed attempts', () => {
        // Mock rate limiting response
        cy.intercept('POST', '**/api/v1/auth/login/', {
            statusCode: 429,
            headers: { 'retry-after': '30' },
            body: {
                error: {
                    code: 'Throttled',
                    message: 'Request was throttled. Expected available in 30 seconds.',
                },
            },
        }).as('loginRequest')

        cy.get('input[name="username"]').type('vet@example.com')
        cy.get('input[name="password"]').type('does-not-matter')

        cy.contains('button', 'Sign in').click()

        cy.wait('@loginRequest')

        // Verify cooldown state
        cy.contains('button', /Try again in \d+s/).should('be.disabled')
        cy.contains('Request was throttled').should('be.visible')
    })
})