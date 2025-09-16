// Client Email Service - Manages client-specific email addresses for AI applications
import { db } from '../utils/database';

export interface ClientEmailInfo {
    id: string;
    client_id: string;
    from_email: string;
    from_name: string;
    reply_to_email?: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface CreateClientEmailData {
    client_id: string;
    from_name: string;
    reply_to_email?: string;
}

export class ClientEmailService {
    /**
     * Generate a unique client email address
     */
    async generateClientEmail(clientId: string, clientName: string): Promise<ClientEmailInfo> {
        try {
            // Check if client already has an active email
            const existingEmail = await this.getClientEmail(clientId);
            if (existingEmail) {
                return existingEmail;
            }

            // Generate email prefix from client name
            const emailPrefix = this.generateEmailPrefix(clientName);

            // Generate unique identifier
            const timestamp = Date.now().toString(36);
            const randomId = Math.random().toString(36).substring(2, 8);

            // Create the email address
            const fromEmail = `${emailPrefix}.${timestamp}.${randomId}@interviewsfirst.com`;
            const fromName = clientName;

            // Insert into database
            const result = await db.query(`
        INSERT INTO client_emails (client_id, from_email, from_name, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [clientId, fromEmail, fromName, true]);

            return this.mapRowToClientEmailInfo(result.rows[0]);
        } catch (error) {
            console.error('Error generating client email:', error);
            throw error;
        }
    }

    /**
     * Get client email by client ID
     */
    async getClientEmail(clientId: string): Promise<ClientEmailInfo | null> {
        try {
            const result = await db.query(`
        SELECT * FROM client_emails 
        WHERE client_id = $1 AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `, [clientId]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapRowToClientEmailInfo(result.rows[0]);
        } catch (error) {
            console.error('Error getting client email:', error);
            return null;
        }
    }

    /**
     * Create a new client email
     */
    async createClientEmail(data: CreateClientEmailData): Promise<ClientEmailInfo> {
        try {
            // Get client name
            const clientResult = await db.query(
                'SELECT name FROM clients WHERE id = $1',
                [data.client_id]
            );

            if (clientResult.rows.length === 0) {
                throw new Error('Client not found');
            }

            const clientName = clientResult.rows[0].name;
            const emailPrefix = this.generateEmailPrefix(clientName);

            // Generate unique identifier
            const timestamp = Date.now().toString(36);
            const randomId = Math.random().toString(36).substring(2, 8);

            // Create the email address
            const fromEmail = `${emailPrefix}.${timestamp}.${randomId}@interviewsfirst.com`;

            // Insert into database
            const result = await db.query(`
        INSERT INTO client_emails (client_id, from_email, from_name, reply_to_email, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [data.client_id, fromEmail, data.from_name, data.reply_to_email, true]);

            return this.mapRowToClientEmailInfo(result.rows[0]);
        } catch (error) {
            console.error('Error creating client email:', error);
            throw error;
        }
    }

    /**
     * Update client email
     */
    async updateClientEmail(clientId: string, updates: Partial<ClientEmailInfo>): Promise<ClientEmailInfo | null> {
        try {
            const setClause = [];
            const values = [];
            let paramCount = 1;

            if (updates.from_name) {
                setClause.push(`from_name = $${paramCount++}`);
                values.push(updates.from_name);
            }

            if (updates.reply_to_email !== undefined) {
                setClause.push(`reply_to_email = $${paramCount++}`);
                values.push(updates.reply_to_email);
            }

            if (updates.is_active !== undefined) {
                setClause.push(`is_active = $${paramCount++}`);
                values.push(updates.is_active);
            }

            if (setClause.length === 0) {
                throw new Error('No updates provided');
            }

            values.push(clientId);

            const result = await db.query(`
        UPDATE client_emails 
        SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE client_id = $${paramCount} AND is_active = true
        RETURNING *
      `, values);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapRowToClientEmailInfo(result.rows[0]);
        } catch (error) {
            console.error('Error updating client email:', error);
            throw error;
        }
    }

    /**
     * Deactivate client email
     */
    async deactivateClientEmail(clientId: string): Promise<boolean> {
        try {
            const result = await db.query(`
        UPDATE client_emails 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE client_id = $1 AND is_active = true
      `, [clientId]);

            return result.rowCount > 0;
        } catch (error) {
            console.error('Error deactivating client email:', error);
            return false;
        }
    }

    /**
     * Get all client emails for a client
     */
    async getClientEmails(clientId: string): Promise<ClientEmailInfo[]> {
        try {
            const result = await db.query(`
        SELECT * FROM client_emails 
        WHERE client_id = $1
        ORDER BY created_at DESC
      `, [clientId]);

            return result.rows.map((row: any) => this.mapRowToClientEmailInfo(row));
        } catch (error) {
            console.error('Error getting client emails:', error);
            return [];
        }
    }

    /**
     * Generate email prefix from client name
     */
    private generateEmailPrefix(clientName: string): string {
        return clientName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '.')
            .replace(/\.+/g, '.')
            .replace(/^\.|\.$/g, '')
            .substring(0, 20); // Limit length
    }

    /**
     * Map database row to ClientEmailInfo
     */
    private mapRowToClientEmailInfo(row: any): ClientEmailInfo {
        return {
            id: row.id,
            client_id: row.client_id,
            from_email: row.from_email,
            from_name: row.from_name,
            reply_to_email: row.reply_to_email,
            is_active: row.is_active,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }
}

// Export singleton instance
export const clientEmailService = new ClientEmailService();
