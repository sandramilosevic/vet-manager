// Page object for the Login page.
// Only element getters and simple actions live here — mirrors OwnerPage.js.

export const LoginPage = {
    // Layout
    heading: () => cy.contains('h1', 'Sign in'),
    usernameInput: () => cy.get('[data-cy="login-username"]'),
    passwordInput: () => cy.get('[data-cy="login-password"]'),
    submitButton: () => cy.get('[data-cy="login-submit"]'),
    forgotPasswordLink: () => cy.get('[data-cy="forgot-password-link"]'),

    // Feedback
    errorBanner: () => cy.get('[role="alert"]'),

    // Actions
    typeUsername: (value) => LoginPage.usernameInput().clear().type(value),
    typePassword: (value) => LoginPage.passwordInput().clear().type(value),
    submit: () => LoginPage.submitButton().click(),

    login: (username, password) => {
        LoginPage.typeUsername(username)
        LoginPage.typePassword(password)
        LoginPage.submit()
    },

    visit: () => cy.visitClean('/login'),
}