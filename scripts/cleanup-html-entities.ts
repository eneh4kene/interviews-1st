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

// HTML entity decoding function (same as in jobAggregation.ts)
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

async function cleanupHtmlEntities() {
    const client = await pgPool.connect();

    try {
        console.log('🧹 Starting HTML entity cleanup for existing job data...');

        // Get all jobs that might have HTML entities or tags
        const result = await client.query(`
            SELECT id, title, company, location, description_snippet
            FROM jobs 
            WHERE title LIKE '%&%' OR title LIKE '%<%'
               OR company LIKE '%&%' OR company LIKE '%<%'
               OR location LIKE '%&%' OR location LIKE '%<%'
               OR description_snippet LIKE '%&%' OR description_snippet LIKE '%<%'
            ORDER BY created_at DESC
        `);

        console.log(`📊 Found ${result.rows.length} jobs with potential HTML entities`);

        if (result.rows.length === 0) {
            console.log('✅ No jobs with HTML entities found. Database is clean!');
            return;
        }

        let updatedCount = 0;
        let errorCount = 0;

        // Process each job
        for (const job of result.rows) {
            try {
                const decodedTitle = stripHtmlTags(decodeHtmlEntities(job.title));
                const decodedCompany = stripHtmlTags(decodeHtmlEntities(job.company));
                const decodedLocation = stripHtmlTags(decodeHtmlEntities(job.location));
                const decodedDescription = stripHtmlTags(decodeHtmlEntities(job.description_snippet));

                // Only update if there were actual changes
                if (decodedTitle !== job.title ||
                    decodedCompany !== job.company ||
                    decodedLocation !== job.location ||
                    decodedDescription !== job.description_snippet) {

                    await client.query(`
                        UPDATE jobs 
                        SET 
                            title = $1,
                            company = $2,
                            location = $3,
                            description_snippet = $4,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $5
                    `, [decodedTitle, decodedCompany, decodedLocation, decodedDescription, job.id]);

                    updatedCount++;
                    console.log(`✅ Updated job: ${decodedTitle} at ${decodedCompany}`);
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ Error updating job ${job.id}:`, error);
            }
        }

        console.log(`\n📈 Cleanup Summary:`);
        console.log(`   • Jobs processed: ${result.rows.length}`);
        console.log(`   • Jobs updated: ${updatedCount}`);
        console.log(`   • Errors: ${errorCount}`);
        console.log(`   • Success rate: ${((updatedCount / result.rows.length) * 100).toFixed(1)}%`);

        if (updatedCount > 0) {
            console.log('\n🎉 HTML entity cleanup completed successfully!');
            console.log('   The job listings should now display properly without weird symbols.');
        } else {
            console.log('\n✨ No updates were needed - all job data was already clean!');
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function main() {
    try {
        await cleanupHtmlEntities();
    } catch (error) {
        console.error('💥 Cleanup failed:', error);
        process.exit(1);
    } finally {
        await pgPool.end();
    }
}

// Run the cleanup
main();
