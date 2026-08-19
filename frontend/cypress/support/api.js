/**
 * Single source of truth for API URL patterns used in cy.intercept().
 *
 * Mirrors the real paths in src/api/resources.ts — trailing slashes matter
 * because Django backends usually don't respond on both forms, so an
 * intercept missing one silently never matches the real request.
 */
export const API = {
    login: '**/api/v1/auth/login/',
    me: '**/api/v1/accounts/me/',
    passwordReset: '**/api/v1/accounts/password-reset/',
    passwordResetConfirm: '**/api/v1/accounts/password-reset/confirm/',
    acceptInvitation: '**/api/v1/accounts/invitations/accept/',
    owners: '**/api/v1/owners/**',
    ownerDetail: '**/api/v1/owners/*/',
}