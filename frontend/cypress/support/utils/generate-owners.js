// Generates a given number of mock owners, used for pagination scenarios
// where the exact content doesn't matter, only the count and shape.

export const generateOwners = (count, startId = 1) => {
    return Array.from({ length: count }, (_, i) => {
        const id = startId + i

        return {
            id,
            first_name: `First${id}`,
            last_name: `Last${id}`,
            email: `owner${id}@example.com`,
            phone_number: '+15550000000',
            address: '123 Main St',
            registration_date: '2026-01-01',
        }
    })
}