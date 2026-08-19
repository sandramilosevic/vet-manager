import { API } from '../../support/api'
import resetPasswordData from '../../fixtures/auth/reset-password.json'

describe('Reset password', () => {
    // cy.visitClean clears localStorage/sessionStorage before the app's own
    // JS runs, so a stale token from a previous test can't trigger an
    // unwanted redirect before we even get to assert anything.
    beforeEach(() => {
        cy.visitClean(`/reset-password/${resetPasswordData.uid}/${resetPasswordData.token}`)
    })

    it('displays the form correctly', () => {
        cy.contains('h1', 'Choose a new password').should('be.visible')

        cy.get('[data-cy="password-new"]').should('be.visible')

        cy.get('[data-cy="password-confirm"]').should('be.visible')

        cy.contains('button', 'Set new password').should('be.visible')

        cy.contains('a', 'Back to sign in').should('have.attr', 'href', '/login')
    })

    it('shows a validation error for a password that is too short', () => {
        // No response stubbed on purpose — client-side validation should
        // block the request entirely, so this intercept exists only to
        // prove nothing was ever sent (see the assertion below).
        cy.intercept('POST', API.passwordResetConfirm).as('resetConfirmRequest')

        cy.get('[data-cy="password-new"]').type(resetPasswordData.shortPassword)
        cy.get('[data-cy="password-confirm"]').type(resetPasswordData.shortPassword)

        cy.get('[data-cy="reset-password-submit"]').click()

        // Error is scoped to its own field, not a bare [role="alert"] lookup,
        // so this can't accidentally pass on some unrelated alert on the page.
        cy.get('[data-cy="password-new"]').siblings('[role="alert"]').should('be.visible')

        cy.get('@resetConfirmRequest.all').should('have.length', 0)
    })

    it('shows a validation error when passwords do not match', () => {
        cy.intercept('POST', API.passwordResetConfirm).as('resetConfirmRequest')

        cy.get('[data-cy="password-new"]').type(resetPasswordData.validPassword)
        cy.get('[data-cy="password-confirm"]').type(resetPasswordData.mismatchPassword)

        cy.get('[data-cy="reset-password-submit"]').click()

        cy.get('[data-cy="password-confirm"]').siblings('[role="alert"]').should('be.visible')

        cy.get('@resetConfirmRequest.all').should('have.length', 0)
    })

    it('resets the password, shows success, and redirects to login', () => {
        // Freezes timers before the submit fires the app's setTimeout-based
        // redirect. Lets us fast-forward with cy.tick() instead of waiting
        // 2.5 real seconds for every run.
        cy.clock()

        cy.intercept('POST', API.passwordResetConfirm, {
            statusCode: 200,
            body: { message: 'Password reset' },
        }).as('resetConfirmRequest')

        cy.get('[data-cy="password-new"]').type(resetPasswordData.validPassword)
        cy.get('[data-cy="password-confirm"]').type(resetPasswordData.validPassword)

        cy.get('[data-cy="reset-password-submit"]').click()

        // Confirms the frontend sends uid + token + password — not just that
        // *a* request went out, but that the payload shape is exactly right.
        cy.wait('@resetConfirmRequest').its('request.body').should('deep.equal', {
            uid: resetPasswordData.uid,
            token: resetPasswordData.token,
            password: resetPasswordData.validPassword,
        })

        cy.get('[data-cy="reset-password-success"]').should('be.visible')

        cy.tick(2500)

        cy.url().should('eq', `${Cypress.config().baseUrl}/login`)
    })

    it('disables the form after too many requests', () => {
        cy.intercept('POST', API.passwordResetConfirm, {
            statusCode: 429,
            headers: { 'retry-after': '30' },
            fixture: 'auth/throttled-error.json',
        }).as('resetConfirmRequest')

        cy.get('[data-cy="password-new"]').type(resetPasswordData.validPassword)
        cy.get('[data-cy="password-confirm"]').type(resetPasswordData.validPassword)

        cy.get('[data-cy="reset-password-submit"]').click()

        // Shared with login.cy.js / forgot-password.cy.js so the 429 UI
        // contract is asserted in exactly one place.
        cy.expectThrottled('resetConfirmRequest')
    })

    it('shows an error banner when the reset link is expired or invalid', () => {
        // Unlike the invite flow, this page does not pre-validate the token
        // format before rendering the form — it only learns the link is bad
        // once the backend rejects the confirm request with a 400.
        cy.intercept('POST', API.passwordResetConfirm, {
            statusCode: 400,
            body: { message: 'This reset link is invalid or has expired.' },
        }).as('resetConfirmRequest')

        cy.get('[data-cy="password-new"]').type(resetPasswordData.validPassword)
        cy.get('[data-cy="password-confirm"]').type(resetPasswordData.validPassword)

        cy.get('[data-cy="reset-password-submit"]').click()

        cy.wait('@resetConfirmRequest')

        cy.contains('This reset link is invalid or has expired').should('be.visible')
        cy.get('[role="alert"]').should('be.visible')

        cy.get('[data-cy="reset-password-success"]').should('not.exist')
    })
})