import { API } from '../support/api'
import ownerList from '../fixtures/owners-list.json'

// OwnerFormModal fields use React's useId(), so their `id`/`for` pair is not
// predictable across renders — unlike the filter inputs, which have fixed
// ids. Targeting by the `.field` wrapper's label text sidesteps that.
const fillField = (label, value) => {
    cy.contains('.field', label).find('input').clear().type(value)
}

describe('Owners list', () => {
    it('redirects an unauthenticated visit to /login', () => {
        // No token in localStorage — RequireAuth should send us to /login
        // before the page ever tries to call the owners API.
        cy.visitClean('/owners')

        cy.url().should('include', '/login')
    })

    it('renders owner data for an authenticated admin', () => {
        // Must be set up before loginAs — the page fires GET /owners/ as
        // soon as it mounts, so the intercept needs to already be in place.
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: ownerList,
        }).as('ownersRequest')

        cy.loginAs('/owners')

        cy.wait('@ownersRequest')

        cy.contains('h1', 'Pet owners').should('be.visible')

        // Proves the profile from loginAs's /me stub reached the UI, not
        // just that the guard let us through.
        cy.get('[data-cy="clinic-name"]').should('contain.text', 'Test Clinic')

        // One row per fixture owner — proves real data reached the table,
        // not just that the page didn't crash.
        ownerList.results.forEach((owner) => {
            cy.contains('a', `${owner.last_name}, ${owner.first_name}`).should('be.visible')
            cy.contains('td', owner.email).should('be.visible')
        })

        cy.get('[data-cy="login-username"]').should('not.exist')
    })

    it('filters by last name', () => {
        // Same stub answers every request in this test — this is a filter
        // *contract* test (does the right query param go out), not a
        // simulation of real server-side filtering.
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: ownerList,
        }).as('ownersRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest') // the initial, unfiltered load on mount

        cy.get('#filter-last-name').type('Jov')

        // Debounced at 350ms (see useDebounce) — cy.wait's default timeout
        // comfortably covers that, so no extra wait is needed here.
        cy.wait('@ownersRequest')
            .its('request.query')
            .should('include', { last_name__icontains: 'Jov' })
    })

    it('shows an empty state when a filter matches nothing', () => {
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: { count: 0, next: null, previous: null, results: [] },
        }).as('ownersRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        cy.get('#filter-last-name').type('Nonexistent')
        cy.wait('@ownersRequest')

        cy.contains('No owners match those filters').should('be.visible')

        // The empty state only offers "Add an owner" when there are no
        // filters active at all — with a filter typed in, that action is
        // deliberately absent (see hasFilters in OwnersPage).
        cy.contains('button', 'Add an owner').should('not.exist')
    })

    it('sorts by last name when the column header is clicked', () => {
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: ownerList,
        }).as('ownersRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest') // default ordering is already 'last_name'

        // Clicking the same field again toggles descending.
        cy.contains('button', 'Sort by last name').click()

        cy.wait('@ownersRequest')
            .its('request.query')
            .should('include', { ordering: '-last_name' })
    })

    it('creates a new owner', () => {
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: ownerList,
        }).as('ownersRequest')

        cy.intercept('POST', API.owners, {
            statusCode: 201,
            body: {
                id: 3,
                first_name: 'Petar',
                last_name: 'Nikolić',
                phone_number: '+381631234567',
                email: 'petar.nikolic@example.com',
                address: 'Kralja Petra 1, Niš',
                registration_date: '2026-08-10',
            },
        }).as('createRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        cy.contains('button', '+ New owner').click()
        cy.contains('h2', 'New owner').should('be.visible')

        fillField('First name', 'Petar')
        fillField('Last name', 'Nikolić')
        fillField('Phone number', '+381631234567')
        fillField('Email', 'petar.nikolic@example.com')
        fillField('Address', 'Kralja Petra 1, Niš')

        cy.contains('button', 'Add owner').click()

        // Confirms the exact payload, not just that a request fired —
        // catches a field silently missing from the submit handler.
        cy.wait('@createRequest').its('request.body').should('deep.equal', {
            first_name: 'Petar',
            last_name: 'Nikolić',
            phone_number: '+381631234567',
            email: 'petar.nikolic@example.com',
            address: 'Kralja Petra 1, Niš',
        })

        // Success toast has role="status" (not "alert") — see useToast —
        // so this also confirms it's announced non-intrusively.
        cy.contains('[role="status"]', 'Owner added').should('be.visible')

        // Modal closes on success — proven by its heading disappearing,
        // not just by some assertion succeeding elsewhere on the page.
        cy.contains('h2', 'New owner').should('not.exist')
    })

    it('edits an existing owner', () => {
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: ownerList,
        }).as('ownersRequest')

        cy.intercept('PATCH', API.ownerDetail, {
            statusCode: 200,
            body: { ...ownerList.results[0], phone_number: '+381699998888' },
        }).as('updateRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        // Scoped to Ana's row specifically — clicking the first "Edit" on
        // the page would still pass by coincidence even if the wrong
        // owner's data leaked into the form.
        cy.contains('tr', 'Jovanović, Ana').within(() => {
            cy.contains('button', 'Edit').click()
        })

        cy.contains('h2', 'Edit owner').should('be.visible')

        // Spot-checks that the form was pre-filled from the row that was
        // clicked, not left blank or filled from the wrong owner.
        cy.contains('.field', 'First name').find('input').should('have.value', 'Ana')

        fillField('Phone number', '+381699998888')
        cy.contains('button', 'Save changes').click()

        cy.wait('@updateRequest')
            .its('request.body')
            .should('deep.include', { phone_number: '+381699998888' })

        cy.contains('[role="status"]', 'Owner updated').should('be.visible')
        cy.contains('h2', 'Edit owner').should('not.exist')
    })

    it('deletes an owner after confirming', () => {
        cy.intercept('GET', API.owners, {
            statusCode: 200,
            body: ownerList,
        }).as('ownersRequest')

        cy.intercept('DELETE', API.ownerDetail, { statusCode: 204 }).as('deleteRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        cy.contains('tr', 'Petrović, Marko').within(() => {
            cy.contains('button', 'Delete').click()
        })

        // Deleting is destructive and irreversible — the confirm dialog is
        // the one thing standing between a misclick and data loss, so its
        // presence (and the exact owner named in it) is worth asserting on
        // its own, before the request is even sent.
        cy.contains('h2', 'Delete this owner?').should('be.visible')
        cy.contains('Marko').should('be.visible')

        cy.get('@deleteRequest.all').should('have.length', 0)

        cy.contains('button', 'Delete owner').click()

        cy.wait('@deleteRequest')
        cy.contains('[role="status"]', 'Marko Petrović removed').should('be.visible')
        cy.contains('h2', 'Delete this owner?').should('not.exist')
    })

    it('shows an error state when the owners list fails to load', () => {
        cy.intercept('GET', API.owners, {
            statusCode: 500,
            body: { message: 'Internal server error' },
        }).as('ownersRequest')

        cy.loginAs('/owners')
        cy.wait('@ownersRequest')

        cy.contains('Could not load this').should('be.visible')
        cy.get('[role="alert"]').should('be.visible')
        cy.contains('button', 'Try again').should('be.visible')

        // The table itself shouldn't render half-broken alongside the error.
        cy.get('table').should('not.exist')
    })
})