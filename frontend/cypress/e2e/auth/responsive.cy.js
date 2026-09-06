import { API } from '../../support/api'
import { LoginPage } from '../../pages/LoginPage'
import loginData from '../../fixtures/auth/login.json'

describe('Responsive login', () => {
    it('usable on a mobile viewport and completes a login', () => {
        cy.viewport('iphone-x')
        LoginPage.visit()

        LoginPage.heading().should('be.visible')
        LoginPage.usernameInput().should('be.visible')
        LoginPage.passwordInput().should('be.visible')
        LoginPage.submitButton().should('be.visible')

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

            cy.wait('@loginRequest')
            cy.wait('@meRequest')
            cy.url().should('not.include', '/login')
        })
    })

    it('usable on a tablet viewport', () => {
        cy.viewport('ipad-2')
        LoginPage.visit()

        LoginPage.heading().should('be.visible')
        LoginPage.usernameInput().should('be.visible')
        LoginPage.passwordInput().should('be.visible')
        LoginPage.submitButton().should('be.visible')
        LoginPage.forgotPasswordLink().should('be.visible')
    })
})
