/**
 * Email Content Cleaner
 * Utilities for cleaning up email content, especially quoted text in replies
 */

/**
 * Clean up quoted text in email content
 * Removes or formats quoted text to make emails more readable
 */
export function cleanQuotedText(content: string): string {
    if (!content) return content;

    // First, handle the specific case of ">" characters breaking up text
    // This happens when email clients break long lines with ">" characters
    let cleaned = content
        // Remove nested quote markers (>>, >>>, etc.) at the beginning of lines
        .replace(/^[>]+\s*/gm, '')
        // Remove standalone ">" characters that break up text (but preserve line structure)
        .replace(/\s+>\s+/g, ' ')
        // Remove embedded quote markers like ">> " and ">>> " within text
        .replace(/\s*[>]{2,}\s*/g, ' ')
        // Clean up multiple spaces but preserve line breaks
        .replace(/[ \t]+/g, ' ')
        // Clean up excessive line breaks
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        // Remove any remaining standalone ">" characters
        .replace(/\s+>\s+/g, ' ');

    // Split content into lines
    const lines = cleaned.split('\n');
    const cleanedLines: string[] = [];
    let inQuotedSection = false;
    let originalMessageFound = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for common quoted text indicators
        const isQuotedLine = line.includes('On ') && line.includes(' wrote:') ||
            line.includes('--- Original Message ---') ||
            line.includes('Begin forwarded message:') ||
            line.includes('From:') && line.includes('Sent:') ||
            line.includes('To:') && line.includes('Subject:');

        if (isQuotedLine && !originalMessageFound) {
            // Found the start of quoted text
            inQuotedSection = true;
            originalMessageFound = true;

            // Add a clean separator
            if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim() !== '') {
                cleanedLines.push('');
                cleanedLines.push('--- Previous Message ---');
                cleanedLines.push('');
            }
            // Don't skip this line, include it in the output
        }

        if (inQuotedSection) {
            // Keep quoted lines but clean them up
            cleanedLines.push(line);
        } else {
            cleanedLines.push(line);
        }
    }

    return cleanedLines.join('\n').trim();
}

/**
 * Clean up HTML content in emails
 * Removes quoted HTML blocks and formats them nicely
 */
export function cleanQuotedHtml(html: string): string {
    if (!html) return html;

    // Remove common quoted HTML patterns
    let cleaned = html
        // Remove blockquotes with quoted content
        .replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '<div class="quoted-message"><p><em>--- Previous Message ---</em></p></div>')
        // Remove divs with quoted content
        .replace(/<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '<div class="quoted-message"><p><em>--- Previous Message ---</em></p></div>')
        // Clean up Outlook quoted content
        .replace(/<div[^>]*class="[^"]*WordSection1[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '<div class="quoted-message"><p><em>--- Previous Message ---</em></p></div>');

    return cleaned;
}

/**
 * Extract the main content from an email, removing quoted text
 */
export function extractMainContent(content: string): string {
    if (!content) return content;

    const lines = content.split('\n');
    const mainLines: string[] = [];
    let foundQuotedSection = false;

    for (const line of lines) {
        // Check if we've hit quoted content
        if (line.startsWith('>') ||
            line.includes('--- Original Message ---') ||
            line.includes('On ') && line.includes(' wrote:') ||
            line.includes('Begin forwarded message:')) {
            foundQuotedSection = true;
            break;
        }

        if (!foundQuotedSection) {
            mainLines.push(line);
        }
    }

    return mainLines.join('\n').trim();
}

/**
 * Format a clean reply message
 */
export function formatReplyMessage(originalContent: string, replyContent: string, originalSender: string, originalDate: string): string {
    const cleanOriginal = extractMainContent(originalContent);

    return `${replyContent}

---

On ${originalDate}, ${originalSender} wrote:

${cleanOriginal}`;
}

/**
 * Clean up email subject lines
 */
export function cleanSubjectLine(subject: string): string {
    if (!subject) return subject;

    // Remove multiple "Re:" prefixes
    return subject.replace(/^(Re:\s*)+/i, 'Re: ');
}
