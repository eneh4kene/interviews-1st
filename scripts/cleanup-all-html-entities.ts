#!/usr/bin/env tsx

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
}

// PostgreSQL connection pool
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// HTML entity decoding function
function decodeHtmlEntities(text: string): string {
    const htmlEntities: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'",
        '&nbsp;': ' ',
        '&copy;': '©',
        '&reg;': '®',
        '&trade;': '™',
        '&hellip;': '...',
        '&mdash;': '—',
        '&ndash;': '–',
        '&lsquo;': '\u2018',
        '&rsquo;': '\u2019',
        '&ldquo;': '"',
        '&rdquo;': '"',
        '&bull;': '•',
        '&para;': '¶',
        '&dagger;': '†',
        '&Dagger;': '‡',
        '&permil;': '‰',
        '&lsaquo;': '‹',
        '&rsaquo;': '›',
        '&euro;': '€',
        '&pound;': '£',
        '&yen;': '¥',
        '&cent;': '¢',
        '&curren;': '¤',
        '&brvbar;': '¦',
        '&sect;': '§',
        '&uml;': '¨',
        '&ordf;': 'ª',
        '&laquo;': '«',
        '&not;': '¬',
        '&shy;': '',
        '&macr;': '¯',
        '&deg;': '°',
        '&plusmn;': '±',
        '&sup2;': '²',
        '&sup3;': '³',
        '&acute;': '´',
        '&micro;': 'µ',
        '&middot;': '·',
        '&cedil;': '¸',
        '&sup1;': '¹',
        '&ordm;': 'º',
        '&raquo;': '»',
        '&frac14;': '¼',
        '&frac12;': '½',
        '&frac34;': '¾',
        '&iquest;': '¿',
        '&Agrave;': 'À',
        '&Aacute;': 'Á',
        '&Acirc;': 'Â',
        '&Atilde;': 'Ã',
        '&Auml;': 'Ä',
        '&Aring;': 'Å',
        '&AElig;': 'Æ',
        '&Ccedil;': 'Ç',
        '&Egrave;': 'È',
        '&Eacute;': 'É',
        '&Ecirc;': 'Ê',
        '&Euml;': 'Ë',
        '&Igrave;': 'Ì',
        '&Iacute;': 'Í',
        '&Icirc;': 'Î',
        '&Iuml;': 'Ï',
        '&ETH;': 'Ð',
        '&Ntilde;': 'Ñ',
        '&Ograve;': 'Ò',
        '&Oacute;': 'Ó',
        '&Ocirc;': 'Ô',
        '&Otilde;': 'Õ',
        '&Ouml;': 'Ö',
        '&times;': '×',
        '&Oslash;': 'Ø',
        '&Ugrave;': 'Ù',
        '&Uacute;': 'Ú',
        '&Ucirc;': 'Û',
        '&Uuml;': 'Ü',
        '&Yacute;': 'Ý',
        '&THORN;': 'Þ',
        '&szlig;': 'ß',
        '&agrave;': 'à',
        '&aacute;': 'á',
        '&acirc;': 'â',
        '&atilde;': 'ã',
        '&auml;': 'ä',
        '&aring;': 'å',
        '&aelig;': 'æ',
        '&ccedil;': 'ç',
        '&egrave;': 'è',
        '&eacute;': 'é',
        '&ecirc;': 'ê',
        '&euml;': 'ë',
        '&igrave;': 'ì',
        '&iacute;': 'í',
        '&icirc;': 'î',
        '&iuml;': 'ï',
        '&eth;': 'ð',
        '&ntilde;': 'ñ',
        '&ograve;': 'ò',
        '&oacute;': 'ó',
        '&ocirc;': 'ô',
        '&otilde;': 'õ',
        '&ouml;': 'ö',
        '&divide;': '÷',
        '&oslash;': 'ø',
        '&ugrave;': 'ù',
        '&uacute;': 'ú',
        '&ucirc;': 'û',
        '&uuml;': 'ü',
        '&yacute;': 'ý',
        '&thorn;': 'þ',
        '&yuml;': 'ÿ'
    };

    return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
        return htmlEntities[entity] || entity;
    });
}

function stripHtmlTags(text: string): string {
    return text.replace(/<[^>]*>/g, ''); // removes <b>, <i>, <br>, etc.
}

function cleanText(text: string): string {
    return stripHtmlTags(decodeHtmlEntities(text));
}

async function cleanupTable(tableName: string, fields: string[], whereClause: string) {
    const client = await pgPool.connect();

    try {
        console.log(`\n🧹 Cleaning ${tableName}...`);

        // Build the query to find records with HTML entities
        const whereConditions = fields.map(field => `${field} LIKE '%&%'`).join(' OR ');
        const query = `
            SELECT id, ${fields.join(', ')}
            FROM ${tableName} 
            WHERE ${whereConditions}
            ORDER BY created_at DESC
        `;

        const result = await client.query(query);
        console.log(`📊 Found ${result.rows.length} records with potential HTML entities`);

        if (result.rows.length === 0) {
            console.log(`✅ No records with HTML entities found in ${tableName}`);
            return { processed: 0, updated: 0, errors: 0 };
        }

        let updatedCount = 0;
        let errorCount = 0;

        // Process each record
        for (const record of result.rows) {
            try {
                const updates: string[] = [];
                const values: any[] = [];
                let valueIndex = 1;

                // Clean each field
                for (const field of fields) {
                    const originalValue = record[field];
                    if (originalValue) {
                        const cleanedValue = cleanText(originalValue);
                        if (cleanedValue !== originalValue) {
                            updates.push(`${field} = $${valueIndex}`);
                            values.push(cleanedValue);
                            valueIndex++;
                        }
                    }
                }

                // Only update if there were changes
                if (updates.length > 0) {
                    values.push(record.id);
                    const updateQuery = `
                        UPDATE ${tableName} 
                        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $${valueIndex}
                    `;

                    await client.query(updateQuery, values);
                    updatedCount++;
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ Error updating ${tableName} record ${record.id}:`, error);
            }
        }

        console.log(`📈 ${tableName} Summary:`);
        console.log(`   • Records processed: ${result.rows.length}`);
        console.log(`   • Records updated: ${updatedCount}`);
        console.log(`   • Errors: ${errorCount}`);

        return { processed: result.rows.length, updated: updatedCount, errors: errorCount };

    } catch (error) {
        console.error(`❌ Error cleaning ${tableName}:`, error);
        return { processed: 0, updated: 0, errors: 1 };
    } finally {
        client.release();
    }
}

async function cleanupAllTables() {
    console.log('🧹 Starting comprehensive HTML entity cleanup for all tables...');

    const tables = [
        {
            name: 'jobs',
            fields: ['title', 'company', 'location', 'description_snippet'],
            whereClause: "title LIKE '%&%' OR company LIKE '%&%' OR location LIKE '%&%' OR description_snippet LIKE '%&%'"
        },
        {
            name: 'applications',
            fields: ['company_name', 'job_title', 'notes'],
            whereClause: "company_name LIKE '%&%' OR job_title LIKE '%&%' OR notes LIKE '%&%'"
        },
        {
            name: 'interviews',
            fields: ['company_name', 'job_title', 'client_response_notes', 'worker_notes'],
            whereClause: "company_name LIKE '%&%' OR job_title LIKE '%&%' OR client_response_notes LIKE '%&%' OR worker_notes LIKE '%&%'"
        },
        {
            name: 'client_notifications',
            fields: ['title', 'message'],
            whereClause: "title LIKE '%&%' OR message LIKE '%&%'"
        },
        {
            name: 'job_preferences',
            fields: ['title', 'company', 'location'],
            whereClause: "title LIKE '%&%' OR company LIKE '%&%' OR location LIKE '%&%'"
        }
    ];

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    for (const table of tables) {
        const result = await cleanupTable(table.name, table.fields, table.whereClause);
        totalProcessed += result.processed;
        totalUpdated += result.updated;
        totalErrors += result.errors;
    }

    console.log(`\n🎉 Comprehensive Cleanup Summary:`);
    console.log(`   • Total records processed: ${totalProcessed}`);
    console.log(`   • Total records updated: ${totalUpdated}`);
    console.log(`   • Total errors: ${totalErrors}`);
    console.log(`   • Success rate: ${totalProcessed > 0 ? ((totalUpdated / totalProcessed) * 100).toFixed(1) : 0}%`);

    if (totalUpdated > 0) {
        console.log('\n✨ All database tables have been cleaned of HTML entities and tags!');
    } else {
        console.log('\n🎯 Database was already clean - no HTML entities found!');
    }
}

async function main() {
    try {
        await cleanupAllTables();
    } catch (error) {
        console.error('💥 Cleanup failed:', error);
        process.exit(1);
    } finally {
        await pgPool.end();
    }
}

// Run the comprehensive cleanup
main();
