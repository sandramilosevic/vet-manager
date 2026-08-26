// Page object for the generic confirm dialog.
// Only element getters and simple actions live here.

export const ConfirmDialog = {
    heading: (text) => cy.contains('h2', text),
    confirmButton: () => cy.get('[data-cy="confirm-dialog-confirm"]'),
    cancelButton: () => cy.get('[data-cy="confirm-dialog-cancel"]'),

    confirm: () => ConfirmDialog.confirmButton().click(),
    cancel: () => ConfirmDialog.cancelButton().click(),
}