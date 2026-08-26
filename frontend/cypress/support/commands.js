import { API } from './api'

Cypress.Commands.add('buildFakeJwt', (payload) => {
    const header = { alg: 'HS256', typ: 'JWT' }

    const toBase64Url = (obj) =>
        btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    const encodedHeader = toBase64Url(header)
    const encodedPayload = toBase64Url(payload)

    const fakeSignature = 'test-signature'

    return `${encodedHeader}.${encodedPayload}.${fakeSignature}`
})

Cypress.Commands.add('visitClean', (path, options = {}) => {
    cy.visit(path, {
        ...options,
        onBeforeLoad(win) {
            win.localStorage.clear()
            win.sessionStorage.clear()
            options.onBeforeLoad?.(win)
        },
    })
})

/**
 * Programmatic login for tests against pages behind RequireAuth/RequireRole.
 *
 * useAuth reads the access token in a useState initializer on mount, so the
 * token must exist in localStorage *before* the app's JS runs — writing to
 * localStorage after cy.visit() resolves is too late, the app has already
 * decided isAuthenticated. This mirrors visitClean's onBeforeLoad pattern
 * for that reason, rather than being built on top of it.
 *
 * claims.role drives what RequireRole allows, GET /accounts/me/ is stubbed
 * automatically since AuthProvider always fires it once claims are non-null
 * — every caller needs that intercept, so it isn't left to each test.
 *
 * Usage:
 *   cy.loginAs('/owners')
 *   cy.loginAs('/staff', { role: 'STAFF' })
 *   cy.loginAs('/owners', { profile: { clinic_name: 'Riverside Clinic' } })
 */
Cypress.Commands.add('loginAs', (path, overrides = {}, options = {}) => {
    const {
        role = 'ADMIN',
        email = 'test.user@example.com',
        clinicName = 'Test Clinic',
        claims: claimsOverrides = {},
        profile: profileOverrides = {},
    } = overrides

    const claims = {
        user_id: '1',
        role,
        email,
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
        ...claimsOverrides,
    }

    const profile = {
        id: 1,
        username: email,
        email,
        first_name: 'Test',
        last_name: 'User',
        role,
        clinic: 1,
        clinic_name: clinicName,
        ...profileOverrides,
    }

    cy.intercept('GET', API.me, { statusCode: 200, body: profile }).as('meRequest')

    cy.buildFakeJwt(claims).then((accessToken) => {
        cy.visit(path, {
            ...options,
            onBeforeLoad(win) {
                win.localStorage.clear()
                win.sessionStorage.clear()
                win.localStorage.setItem('vetmanager.access', accessToken)
                win.localStorage.setItem('vetmanager.refresh', 'fake-refresh-token')
                options.onBeforeLoad?.(win)
            },
        })
    })

    // Every page behind RequireAuth waits on this before it has anything to
    // render, so resolving it here means callers land straight on real
    // content instead of the "Restoring your session…" loading state.
    cy.wait('@meRequest')
})

Cypress.Commands.add('expectThrottled', (alias) => {
    cy.wait(`@${alias}`)
    cy.contains('button', /Try again in \d+s/).should('be.disabled')
    cy.contains('Request was throttled').should('be.visible')
})

Cypress.Commands.add('fillField', (dataCy, value) => {
    cy.get(`[data-cy="${dataCy}"]`).then(($el) => {
        const tagName = $el.prop('tagName').toLowerCase()

        if (tagName === 'select') {
            cy.wrap($el).select(value)
        } else {
            cy.wrap($el).clear().type(value)
        }
    })
})