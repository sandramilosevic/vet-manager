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

Cypress.Commands.add('expectThrottled', (alias) => {
    cy.wait(`@${alias}`)
    cy.contains('button', /Try again in \d+s/).should('be.disabled')
    cy.contains('Request was throttled').should('be.visible')
})