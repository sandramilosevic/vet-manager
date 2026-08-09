import { API } from '../support/api'
import inviteData from '../fixtures/accept-invite.json'

describe('Accept invite', () => {
    describe('with an invalid token', () => {
        it('shows error banner when invite token is not valid', () => {
            cy.visit(`/invite/${inviteData.invalidToken}`)

            cy.contains('Invalid invitation link').should('be.visible')
            cy.get('[role="alert"]').should('be.visible')

            cy.contains('a', 'Back to sign in')
                .should('have.attr', 'href', '/login')

            cy.url().should('include', `/invite/${inviteData.invalidToken}`)
        })
    })

    describe('with a valid token', () => {
        beforeEach(() => {
            cy.visit(`/invite/${inviteData.validToken}`)
        })

        it('displays the form correctly', () => {
            cy.contains('h1', 'Accept your invitation')
                .should('be.visible')

            cy.get('[data-cy="password-new"]')
                .should('be.visible')

            cy.get('[data-cy="password-confirm"]')
                .should('be.visible')

            cy.contains('button', 'Create my account')
                .should('be.visible')

            cy.contains('a', 'Already have an account? Sign in')
                .should('be.visible')
        })

        it('shows a validation error for a password that is too short', () => {
            cy.intercept('POST', API.acceptInvitation)
                .as('acceptRequest')

            cy.get('[data-cy="password-new"]')
                .type(inviteData.shortPassword)

            cy.get('[data-cy="password-confirm"]')
                .type(inviteData.shortPassword)

            cy.get('[data-cy="accept-invite-submit"]')
                .click()

            cy.get('[data-cy="password-new"]')
                .siblings('[role="alert"]')
                .should('be.visible')

            cy.get('@acceptRequest.all')
                .should('have.length', 0)
        })

        it('shows a validation error when passwords do not match', () => {
            cy.intercept('POST', API.acceptInvitation)
                .as('acceptRequest')

            cy.get('[data-cy="password-new"]')
                .type(inviteData.validPassword)

            cy.get('[data-cy="password-confirm"]')
                .type(inviteData.mismatchPassword)

            cy.get('[data-cy="accept-invite-submit"]')
                .click()

            cy.get('[data-cy="password-confirm"]')
                .siblings('[role="alert"]')
                .should('be.visible')

            cy.get('@acceptRequest.all')
                .should('have.length', 0)
        })

        it('accepts the invitation, shows success, and redirects to login', () => {
            cy.clock()

            cy.intercept('POST', API.acceptInvitation, {
                statusCode: 200,
                body: {
                    message: 'Invitation accepted.'
                }
            }).as('acceptRequest')

            cy.get('[data-cy="password-new"]')
                .type(inviteData.validPassword)

            cy.get('[data-cy="password-confirm"]')
                .type(inviteData.validPassword)

            cy.get('[data-cy="accept-invite-submit"]')
                .click()

            cy.wait('@acceptRequest')
                .its('request.body')
                .should('deep.equal', {
                    token: inviteData.validToken,
                    password: inviteData.validPassword
                })

            cy.get('[data-cy="accept-invite-success"]')
                .should('be.visible')

            cy.tick(2500)

            cy.url()
                .should('eq', `${Cypress.config().baseUrl}/login`)
        })
    })
})
