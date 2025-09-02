#!/usr/bin/env node

// Update password_hash for existing users without touching other tables

const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('🔐 Updating user password hashes...');

        const updates = [
            { email: 'admin@interview-me.com', hash: '$2b$10$l84PL.Lss3yLG/kSE2VJme/2l4DPCZfeHGppQh5UG5S9ARpaH0grW' }, // admin@admin
            { email: 'worker1@interview-me.com', hash: '$2b$10$Wr9hV2ThMbCscbt8i0ZL6uCN2SG0jyA55SiVXQPMEeN22L59.YRgm' }, // password@worker
            { email: 'worker2@interview-me.com', hash: '$2b$10$Wr9hV2ThMbCscbt8i0ZL6uCN2SG0jyA55SiVXQPMEeN22L59.YRgm' }, // password@worker
            { email: 'client1@email.com', hash: '$2b$10$ogxsLA3t5VVb31TaMJwIR.p.Qs6EZCLlWadak5Qy6r71j4d7RTt2S' }, // password@client
            { email: 'client2@email.com', hash: '$2b$10$ogxsLA3t5VVb31TaMJwIR.p.Qs6EZCLlWadak5Qy6r71j4d7RTt2S' },
            { email: 'client3@email.com', hash: '$2b$10$ogxsLA3t5VVb31TaMJwIR.p.Qs6EZCLlWadak5Qy6r71j4d7RTt2S' },
            { email: 'client4@email.com', hash: '$2b$10$ogxsLA3t5VVb31TaMJwIR.p.Qs6EZCLlWadak5Qy6r71j4d7RTt2S' },
            { email: 'client5@email.com', hash: '$2b$10$ogxsLA3t5VVb31TaMJwIR.p.Qs6EZCLlWadak5Qy6r71j4d7RTt2S' },
        ];

        let updated = 0;
        for (const u of updates) {
            const res = await client.query(
                'UPDATE users SET password_hash = $1 WHERE email = $2',
                [u.hash, u.email]
            );
            updated += res.rowCount;
        }

        console.log(`✅ Updated password hashes for ${updated} user(s).`);
    } catch (err) {
        console.error('❌ Failed to update user passwords:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(console.error);


