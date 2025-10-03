/**
 * HTML Sanitization Utilities
 * Handles cleaning and processing of HTML email content
 */

// Simple HTML tag removal for text extraction
export function stripHtmlTags(html: string): string {
    if (!html) return '';

    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, '');

    // Decode HTML entities
    text = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');

    // Clean up multiple whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
}

// Clean up Gmail forwarded message HTML
export function cleanGmailHtml(html: string): string {
    if (!html) return '';

    // Remove Gmail-specific wrapper divs and quotes
    let cleaned = html
        .replace(/<div[^>]*class="gmail_quote[^"]*"[^>]*>.*?<\/div>/gs, '') // Remove Gmail quote containers
        .replace(/<div[^>]*class="gmail_attr"[^>]*>.*?<\/div>/gs, '') // Remove Gmail attributes
        .replace(/---------- Forwarded message ---------.*?<\/div>/gs, '') // Remove forwarded message headers
        .replace(/From:.*?<br>/gs, '') // Remove From lines
        .replace(/Date:.*?<br>/gs, '') // Remove Date lines
        .replace(/Subject:.*?<br>/gs, '') // Remove Subject lines
        .replace(/To:.*?<br>/gs, '') // Remove To lines
        .replace(/<br><br>/g, '\n\n') // Convert double breaks to newlines
        .replace(/<br>/g, '\n') // Convert single breaks to newlines
        .replace(/<div[^>]*dir="ltr"[^>]*>/g, '') // Remove direction divs
        .replace(/<\/div>/g, '') // Remove closing divs
        .replace(/<strong[^>]*>/g, '**') // Convert strong to markdown
        .replace(/<\/strong>/g, '**')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g, '$2 ($1)') // Convert links to text
        .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');

    // Clean up multiple newlines and spaces
    cleaned = cleaned
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 consecutive newlines
        .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
        .trim();

    return cleaned;
}

// Check if content is HTML
export function isHtmlContent(content: string): boolean {
    if (!content) return false;
    return /<[^>]+>/.test(content);
}

// Process email content for display
export function processEmailContent(content: string): {
    isHtml: boolean;
    textContent: string;
    htmlContent?: string;
} {
    if (!content) {
        return { isHtml: false, textContent: '' };
    }

    const isHtml = isHtmlContent(content);

    if (isHtml) {
        // Clean up Gmail HTML and extract text
        const cleanedHtml = cleanGmailHtml(content);
        const textContent = stripHtmlTags(cleanedHtml);

        return {
            isHtml: true,
            textContent,
            htmlContent: cleanedHtml
        };
    } else {
        return {
            isHtml: false,
            textContent: content
        };
    }
}
