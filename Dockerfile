# Use official n8n Docker image as base
FROM n8nio/n8n:latest

# Set working directory
WORKDIR /home/node

# Install additional dependencies for workflow management
USER root
RUN apk add --no-cache curl jq

# Switch back to node user
USER node

# Create directories for workflows and scripts
RUN mkdir -p /home/node/workflows /home/node/scripts

# Copy workflow import script
COPY --chown=node:node scripts/import-workflows.sh /home/node/scripts/
RUN chmod +x /home/node/scripts/import-workflows.sh

# Copy workflows directory
COPY --chown=node:node workflows/ /home/node/workflows/

# Set production environment variables
ENV NODE_ENV=production
ENV N8N_HOST=0.0.0.0
ENV N8N_PORT=5678
ENV N8N_PROTOCOL=https
ENV GENERIC_TIMEZONE=UTC

# Production settings (will be overridden by Railway environment variables)
ENV N8N_SECURE_COOKIE=true
ENV N8N_USER_MANAGEMENT_DISABLED=false
ENV N8N_DIAGNOSTICS_ENABLED=false
ENV N8N_VERSION_NOTIFICATIONS_ENABLED=false
ENV N8N_TEMPLATES_ENABLED=false
ENV N8N_ONBOARDING_FLOW_DISABLED=true
ENV N8N_LOG_LEVEL=info
ENV N8N_LOG_OUTPUT=console

# Create entrypoint script that imports workflows and starts n8n
COPY --chown=node:node scripts/entrypoint.sh /home/node/scripts/
RUN chmod +x /home/node/scripts/entrypoint.sh

# Use custom entrypoint
ENTRYPOINT ["/home/node/scripts/entrypoint.sh"]
CMD ["n8n", "start"]
