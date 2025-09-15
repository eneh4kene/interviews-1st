# Scripts Directory

This directory contains essential database and setup scripts for the InterviewsFirst platform.

## Core Scripts

### Database Schema
- **`init-db.sql`** - Main database schema with all tables and initial indexes
- **`ai-apply-core-schema.sql`** - AI Apply system tables and functionality
- **`email-schema.sql`** - Email system tables and templates
- **`email-inbox-schema.sql`** - Email inbox functionality
- **`create-email-templates.sql`** - Email template definitions

### Performance & Optimization
- **`optimize-job-discovery.sql`** - Database indexes for job discovery performance
- **`add-priority-to-templates.sql`** - Email template priority system

### Migration & Setup
- **`migrate-database.js`** - Database migration system
- **`setup-email-database.js`** - Email system setup script
- **`seed-database.js`** - Database seeding for development

## Usage

### Initial Setup
```bash
# Run the main schema
psql $DATABASE_URL -f scripts/init-db.sql

# Add AI Apply functionality
psql $DATABASE_URL -f scripts/ai-apply-core-schema.sql

# Setup email system
psql $DATABASE_URL -f scripts/email-schema.sql
psql $DATABASE_URL -f scripts/email-inbox-schema.sql
psql $DATABASE_URL -f scripts/create-email-templates.sql

# Add performance optimizations
psql $DATABASE_URL -f scripts/optimize-job-discovery.sql
```

### Development
```bash
# Seed with test data
node scripts/seed-database.js
```

## Cleanup History

Removed 23 outdated/unnecessary files:
- All test files (`test-*.js`)
- Duplicate schema files
- Demo files (`demo-*.js`)
- Old migration files
- Cleanup scripts
- Mock data files
- Utility scripts no longer needed

**Before:** 33 files  
**After:** 10 files (+ README)
