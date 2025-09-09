const fs = require('fs');
const path = require('path');

// Read the markdown file
const markdownContent = fs.readFileSync('Adaeze_Onah_Onboarding_Guide.md', 'utf8');

// Simple markdown to HTML converter
function markdownToHtml(markdown) {
    return markdown
        // Headers
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^#### (.*$)/gim, '<h4>$1</h4>')

        // Bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

        // Italic text
        .replace(/\*(.*?)\*/g, '<em>$1</em>')

        // Code blocks
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')

        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')

        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

        // Images
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />')

        // Horizontal rules
        .replace(/^---$/gim, '<hr>')

        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')

        // Wrap in paragraphs
        .replace(/^(?!<[h1-6]|<hr|<pre|<div)(.*)$/gim, '<p>$1</p>')

        // Clean up empty paragraphs
        .replace(/<p><\/p>/g, '')
        .replace(/<p><br><\/p>/g, '');
}

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Adaeze Onah - InterviewsFirst Onboarding Guide</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #6A3FFB;
            text-align: center;
            border-bottom: 3px solid #6A3FFB;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        h2 {
            color: #8B5CF6;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        h3 {
            color: #6A3FFB;
            margin-top: 25px;
            margin-bottom: 10px;
        }
        h4 {
            color: #8B5CF6;
            margin-top: 20px;
            margin-bottom: 8px;
        }
        p {
            margin-bottom: 15px;
            text-align: justify;
        }
        strong {
            color: #6A3FFB;
        }
        code {
            background-color: #f1f3f4;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
        }
        pre {
            background-color: #f1f3f4;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
        }
        hr {
            border: none;
            height: 2px;
            background: linear-gradient(to right, #6A3FFB, #8B5CF6);
            margin: 30px 0;
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo img {
            width: 80px;
            height: 80px;
        }
        .logo h1 {
            margin-top: 10px;
            color: #6A3FFB;
        }
        ul, ol {
            margin-left: 20px;
            margin-bottom: 15px;
        }
        li {
            margin-bottom: 8px;
        }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        ${markdownToHtml(markdownContent)}
    </div>
</body>
</html>
`;

// Write the HTML file
fs.writeFileSync('Adaeze_Onah_Onboarding_Guide.html', htmlContent);
console.log('HTML file created successfully! Open Adaeze_Onah_Onboarding_Guide.html in your browser.');
