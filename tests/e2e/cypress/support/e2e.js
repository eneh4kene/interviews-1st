// Global Cypress commands and hooks can go here

Cypress.Commands.add('loginAsWorker', () => {
    const email = Cypress.env('WORKER_EMAIL');
    const password = Cypress.env('WORKER_PASSWORD');

    return cy.request('POST', '/api/auth/login', { email, password }).then((res) => {
        expect(res.status).to.eq(200);
        const token = res.body.token;
        expect(token).to.exist;
        return token;
    });
});



