// Page object for the Owners list page.
// Only element getters and simple actions live here.

export const OwnersPage = {
    // Layout
    heading: () => cy.contains('h1', 'Pet owners'),
    clinicName: () => cy.get('[data-cy="clinic-name"]'),
    newOwnerButton: () => cy.get('[data-cy="owner-new-button"]'),
    emptyAddButton: () => cy.get('[data-cy="owner-empty-add-button"]'),

    // Filters
    filterLastName: () => cy.get('#filter-last-name'),
    filterFirstName: () => cy.get('#filter-first-name'),
    filterEmail: () => cy.get('#filter-email'),

    typeFilterLastName: (value) => cy.get('#filter-last-name').type(value),
    typeFilterFirstName: (value) => cy.get('#filter-first-name').type(value),
    typeFilterEmail: (value) => cy.get('#filter-email').type(value),

    clearFiltersButton: () => cy.get('[data-cy="owner-clear-filters-button"]'),
    clearFilters: () => OwnersPage.clearFiltersButton().click(),

    // Rows
    ownerRows: () => cy.get('[data-cy="owner-row"]'),
    ownerRow: (fullName) => cy.contains('[data-cy="owner-row"]', fullName),

    editButtonFor: (fullName) => {
        return OwnersPage.ownerRow(fullName).find('[data-cy="owner-edit-button"]')
    },
    deleteButtonFor: (fullName) => {
        return OwnersPage.ownerRow(fullName).find('[data-cy="owner-delete-button"]')
    },
    linkFor: (fullName) => {
        return OwnersPage.ownerRow(fullName).find('a')
    },

    // Sorting
    sortByLastName: () => cy.get('[data-cy="owner-sort-last-name"]'),
    sortByRegistrationDate: () => cy.get('[data-cy="owner-sort-registration-date"]'),

    sortIndicatorFor: (sortSelector) => sortSelector().find('.table__sort-indicator'),

    // Pagination
    paginationNext: () => cy.get('[data-cy="pagination-next"]'),
    paginationPrevious: () => cy.get('[data-cy="pagination-previous"]'),

    // Error / empty / loading states
    retryButton: () => cy.get('[data-cy="error-retry-button"]'),
    loadingSkeleton: () => cy.get('[data-cy="table-skeleton"]'),

    // Toast
    toast: () => cy.get('[data-cy="toast"]'),
}