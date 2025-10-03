// Global Cypress commands and hooks can go here

declare global {
    namespace Cypress {
        interface Chainable {
            loginAsWorker(): Chainable<string>; // returns JWT token
        }
    }
}

Cypress.Commands.add('loginAsWorker', () => {
    const email = Cypress.env('WORKER_EMAIL');
    const password = Cypress.env('WORKER_PASSWORD');

    return cy.request('POST', '/api/auth/login', { email, password }).then((res) => {
        expect(res.status).to.eq(200);
        const token = res.body.token;
        expect(token).to.exist;
        return token as string;
    });
});

export { };


