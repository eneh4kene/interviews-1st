import { db } from '../utils/database';

export interface ClientDomainConfig {
    id: string;
    client_id: string;
    custom_domain: string;
    domain_verified: boolean;
    sender_email: string;
    created_at: Date;
    updated_at: Date;
}

export class ClientDomainService {
    // Get client domain configuration
    async getClientDomainConfig(clientId: string): Promise<ClientDomainConfig | null> {
        try {
            const result = await db.query(`
        SELECT id, custom_domain, domain_verified, sender_email, created_at, updated_at
        FROM clients
        WHERE id = $1
      `, [clientId]);

            if (result.rows.length === 0) {
                return null;
            }

            const client = result.rows[0];
            return {
                id: client.id,
                client_id: client.id, // Use id as client_id
                custom_domain: client.custom_domain,
                domain_verified: client.domain_verified,
                sender_email: client.sender_email,
                created_at: client.created_at,
                updated_at: client.updated_at
            };
        } catch (error) {
            console.error('Error getting client domain config:', error);
            throw error;
        }
    }

    // Set client custom domain
    async setClientDomain(clientId: string, customDomain: string, senderEmail?: string): Promise<void> {
        try {
            // Extract domain from email if provided
            const domain = customDomain.includes('@')
                ? customDomain.split('@')[1]
                : customDomain;

            // Generate sender email if not provided
            const email = senderEmail || `careers@${domain}`;

            await db.query(`
        UPDATE clients 
        SET custom_domain = $1, sender_email = $2, domain_verified = false, updated_at = NOW()
        WHERE id = $3
      `, [domain, email, clientId]);

            console.log(`Client ${clientId} domain set to ${domain} with sender email ${email}`);
        } catch (error) {
            console.error('Error setting client domain:', error);
            throw error;
        }
    }

    // Verify client domain (would integrate with SendGrid domain verification)
    async verifyClientDomain(clientId: string): Promise<boolean> {
        try {
            const config = await this.getClientDomainConfig(clientId);
            if (!config || !config.custom_domain) {
                return false;
            }

            // TODO: Integrate with SendGrid domain verification API
            // For now, we'll simulate verification
            const isVerified = await this.checkDomainVerification(config.custom_domain);

            if (isVerified) {
                await db.query(`
          UPDATE clients 
          SET domain_verified = true, updated_at = NOW()
          WHERE id = $1
        `, [clientId]);
            }

            return isVerified;
        } catch (error) {
            console.error('Error verifying client domain:', error);
            return false;
        }
    }

    // Check if domain is verified in SendGrid
    private async checkDomainVerification(domain: string): Promise<boolean> {
        // TODO: Implement SendGrid domain verification check
        // This would call SendGrid API to check domain status
        // For now, return false to indicate manual verification needed
        return false;
    }

    // Generate client-specific email address
    private generateClientEmail(clientName: string): string {
        // Convert name to email format: "Nkiru Ethan" -> "nkiru.ethan@interviewsfirst.com"
        const emailName = clientName
            .toLowerCase()
            .replace(/[^a-z\s]/g, '') // Remove special characters
            .replace(/\s+/g, '.') // Replace spaces with dots
            .trim();

        return `${emailName}@interviewsfirst.com`;
    }

    // Get sender email for client (with fallback)
    async getSenderEmail(clientId: string): Promise<string> {
        try {
            console.log(`Getting sender email for client: ${clientId}`);

            // First, check if client has an existing email in client_emails table
            const clientEmailResult = await db.query(`
                SELECT from_email, from_name 
                FROM client_emails 
                WHERE client_id = $1 AND is_active = TRUE
                ORDER BY created_at DESC
                LIMIT 1
            `, [clientId]);

            if (clientEmailResult.rows.length > 0) {
                const clientEmail = clientEmailResult.rows[0];
                console.log(`Using existing client email: ${clientEmail.from_email} for client ${clientId}`);
                return clientEmail.from_email;
            }

            // If no existing email, get client info and generate one
            const result = await db.query(`
                SELECT id, name, custom_domain, sender_email, domain_verified
                FROM clients
                WHERE id = $1
            `, [clientId]);

            if (result.rows.length === 0) {
                const fallbackEmail = process.env.VERIFIED_SENDER_EMAIL || 'noreply@interviewsfirst.com';
                console.log(`Client not found, using fallback: ${fallbackEmail}`);
                return fallbackEmail;
            }

            const client = result.rows[0];

            // If client has a custom sender email in clients table, use it
            if (client.sender_email) {
                console.log(`Using configured sender email: ${client.sender_email}`);
                return client.sender_email;
            }

            // Generate client-specific email address
            const clientEmail = this.generateClientEmail(client.name);
            console.log(`Generated client email: ${clientEmail} for ${client.name}`);

            // Store the generated email in client_emails table
            await db.query(`
                INSERT INTO client_emails (client_id, from_email, from_name, is_active, created_at)
                VALUES ($1, $2, $3, TRUE, NOW())
                ON CONFLICT (client_id, from_email) DO UPDATE SET
                    is_active = TRUE,
                    updated_at = NOW()
            `, [clientId, clientEmail, client.name]);

            // Also update the client record with the generated email
            await db.query(`
                UPDATE clients 
                SET sender_email = $1, updated_at = NOW()
                WHERE id = $2
            `, [clientEmail, clientId]);

            return clientEmail;
        } catch (error) {
            console.error('Error getting sender email:', error);
            const fallbackEmail = process.env.VERIFIED_SENDER_EMAIL || 'noreply@interviewsfirst.com';
            console.log(`Using fallback sender email due to error: ${fallbackEmail}`);
            return fallbackEmail;
        }
    }

    // Get all clients with custom domains
    async getClientsWithDomains(): Promise<ClientDomainConfig[]> {
        try {
            const result = await db.query(`
        SELECT id, custom_domain, domain_verified, sender_email, created_at, updated_at
        FROM clients
        WHERE custom_domain IS NOT NULL
        ORDER BY updated_at DESC
      `);

            return result.rows.map((client: any) => ({
                id: client.id,
                client_id: client.id, // Use id as client_id
                custom_domain: client.custom_domain,
                domain_verified: client.domain_verified,
                sender_email: client.sender_email,
                created_at: client.created_at,
                updated_at: client.updated_at
            }));
        } catch (error) {
            console.error('Error getting clients with domains:', error);
            throw error;
        }
    }

    // Delete client domain configuration
    async deleteClientDomain(clientId: string): Promise<void> {
        try {
            await db.query(`
        UPDATE clients 
        SET custom_domain = NULL, sender_email = NULL, domain_verified = false, updated_at = NOW()
        WHERE id = $1
      `, [clientId]);

            console.log(`Client ${clientId} domain configuration deleted`);
        } catch (error) {
            console.error('Error deleting client domain:', error);
            throw error;
        }
    }
}

export const clientDomainService = new ClientDomainService();
