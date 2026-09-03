import { API } from '../../support/api'
import ownerList from '../../fixtures/owners/owners-list.json'

describe('Session persistence', () => {
    beforeEach(() => {
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: ownerList,
        }).as('ownersRequest')
    })

    // TC-28 — session survives a full page reload
    it('keeps the user signed in after a page reload', () => {
        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        cy.window().then((win) => {
            const accessBefore = win.localStorage.getItem('vetmanager.access')
            expect(accessBefore).to.be.a('string').and.not.be.empty

            cy.intercept('GET', API.me, {
                statusCode: 200,
                body: { id: 1, username: 'test.user@example.com', email: 'test.user@example.com', role: 'ADMIN', clinic: 1, clinic_name: 'Test Clinic' },
            }).as('meRequestAfterReload')

            cy.reload()
            cy.wait('@meRequestAfterReload')

            // Not bounced to /login, and the same token is still in storage.
            cy.url().should('include', '/owners')
            cy.get('[data-cy="login-username"]').should('not.exist')

            cy.window().then((winAfter) => {
                expect(winAfter.localStorage.getItem('vetmanager.access')).to.eq(accessBefore)
            })
        })
    })

    // TC-29 — the persisted token keeps being sent on subsequent API calls
    it('reuses the stored token as the Authorization header on later requests', () => {
        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        cy.window().then((win) => {
            const accessToken = win.localStorage.getItem('vetmanager.access')

            cy.intercept('GET', API.owners, (req) => {
                expect(req.headers.authorization).to.eq(`Bearer ${accessToken}`)
                req.reply({ statusCode: 200, body: ownerList })
            }).as('ownersRequestAgain')

            cy.visit('/owners')
            cy.wait('@ownersRequestAgain')

            cy.get('[data-cy="login-username"]').should('not.exist')
        })
    })
})