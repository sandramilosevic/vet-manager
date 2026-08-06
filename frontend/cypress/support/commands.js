Cypress.Commands.add('buildFakeJwt', (payload) => {
    const header = { alg: 'HS256', typ: 'JWT' }


    const toBase64Url = (obj) =>
        btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    const encodedHeader = toBase64Url(header)
    const encodedPayload = toBase64Url(payload)

    const fakeSignature = 'test-signature'

    return '${encodedHeader}.${encodedPayload}.${fakeSignature}'
})