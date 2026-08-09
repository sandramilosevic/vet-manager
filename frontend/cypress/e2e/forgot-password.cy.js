import { API } from '../support/api'
import forgotPasswordData from '../fixtures/forgot-password.json'

describe('Forgot password', () => {
    beforeEach(() => {
        cy.visit('/forgot-password', {
            onBeforeLoad(win) {
                win.localStorage.clear()
                win.sessionStorage.clear()
            },
        })
    })

    it('displays the form correctly', () => {
        cy.contains('h1', 'Reset your password').should('be.visible')

        cy.get('[data-cy="forgot-email"]')
            .should('be.visible')
            .and('have.attr', 'type', 'email')

        cy.get('[data-cy="forgot-submit"]')
            .should('be.enabled')
            .and('contain', 'Send reset link')

        cy.contains('a', 'Back to sign in').should('have.attr', 'href', '/login')
    })

    it('shows a validation error for an invalid email', () => {
        cy.intercept('POST', API.passwordReset).as('resetRequest')

        cy.get('[data-cy="forgot-email"]').type(forgotPasswordData.invalidEmail)
        cy.get('[data-cy="forgot-submit"]').click()

        cy.get('[role="alert"]').should('be.visible')
        cy.url().should('include', '/forgot-password')
        cy.get('@resetRequest.all').should('have.length', 0)
    })

    it('shows the same generic message whether or not the account exists', () => {
        cy.intercept('POST', API.passwordReset, {
            statusCode: 200,
            fixture: 'forgot-password-success.json',
        }).as('resetRequest')

        cy.get('[data-cy="forgot-email"]').type(forgotPasswordData.email)
        cy.get('[data-cy="forgot-submit"]').click()

        cy.wait('@resetRequest').its('request.body').should('deep.equal', {
            email: forgotPasswordData.email,
        })

        cy.get('[data-cy="forgot-success"]').should('be.visible')
        cy.contains('a reset link is on its way').should('be.visible')
        cy.get('[data-cy="forgot-email"]').should('not.exist')
    })

    it('disables the form after too many requests', () => {
        cy.intercept('POST', API.passwordReset, {
            statusCode: 429,
            headers: { 'retry-after': '30' },
            fixture: 'throttled-error.json',
        }).as('resetRequest')

        cy.get('[data-cy="forgot-email"]').type(forgotPasswordData.email)
        cy.get('[data-cy="forgot-submit"]').click()

        cy.wait('@resetRequest')

        cy.contains('button', /Try again in \d+s/).should('be.disabled')
        cy.contains('Request was throttled').should('be.visible')
    })
})