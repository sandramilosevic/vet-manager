// Page object for the owner create/edit form.

export const OwnerForm = {
    heading: (text) => cy.contains('h2', text),

    firstName: () => cy.get('[data-cy="owner-first-name"]'),
    lastName: () => cy.get('[data-cy="owner-last-name"]'),
    phoneNumber: () => cy.get('[data-cy="owner-phone-number"]'),
    email: () => cy.get('[data-cy="owner-email"]'),
    address: () => cy.get('[data-cy="owner-address"]'),

    firstNameError: () => cy.get('[data-cy="owner-first-name-error"]'),
    lastNameError: () => cy.get('[data-cy="owner-last-name-error"]'),
    phoneNumberError: () => cy.get('[data-cy="owner-phone-number-error"]'),
    emailError: () => cy.get('[data-cy="owner-email-error"]'),

    submitButton: () => cy.get('[data-cy="owner-form-submit"]'),
    cancelButton: () => cy.get('[data-cy="owner-form-cancel"]'),

    submit: () => cy.get('[data-cy="owner-form-submit"]'),
    cancel: () => cy.get('[data-cy="owner-form-cancel"]'),

    fillAll: (owner) => {
        cy.fillField('owner-first-name', owner.first_name)
        cy.fillField('owner-last-name', owner.last_name)
        cy.fillField('owner-phone-number', owner.phone_number)
        cy.fillField('owner-email', owner.email)
        cy.fillField('owner-address', owner.address)
    }
}