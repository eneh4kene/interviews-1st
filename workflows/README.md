# n8n Workflows Directory

This directory contains n8n workflow JSON files that will be automatically imported when the Docker container starts.

## How It Works

1. **Hybrid Deployment**: Workflows are imported only if they don't already exist in the n8n instance
2. **Auto-Import**: The `import-workflows.sh` script runs on container startup
3. **Safe Updates**: Existing workflows are never overwritten, only new ones are imported

## Adding Workflows

1. Export your workflow from n8n as JSON
2. Save it in this directory with a descriptive name (e.g., `ai-resume-generation.json`)
3. Commit and push to trigger a new deployment
4. The workflow will be automatically imported on the next deployment

## Workflow Naming Convention

Use descriptive names that indicate the workflow's purpose:
- `ai-resume-generation.json` - AI resume generation workflow
- `ai-apply-automation.json` - AI job application workflow
- `email-processing.json` - Email processing workflow

## Important Notes

- **File Format**: Only `.json` files are processed
- **Naming**: Workflow names in n8n will match the filename (without .json extension)
- **Updates**: To update an existing workflow, you need to delete it from n8n first, then redeploy
- **Backup**: Always backup your workflows before making changes

## Example Workflow Structure

```json
{
  "name": "AI Resume Generation",
  "nodes": [
    {
      "parameters": {},
      "id": "webhook",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300],
      "webhookId": "ai-resume"
    }
  ],
  "connections": {},
  "active": true,
  "settings": {},
  "versionId": "1"
}
```

## Troubleshooting

If workflows aren't importing:
1. Check the container logs for import errors
2. Verify the JSON format is valid
3. Ensure the workflow name doesn't conflict with existing workflows
4. Check that n8n is fully started before import runs
