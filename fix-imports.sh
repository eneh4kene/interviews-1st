#!/bin/bash

# Fix middleware imports in API routes
cd apps/web

# List of files to fix
files=(
    "src/app/api/client-emails/[clientId]/route.ts"
    "src/app/api/ai-apply/submit/route.ts"
    "src/app/api/ai-apply/reject/route.ts"
    "src/app/api/ai-apply/approve/route.ts"
    "src/app/api/ai-apply/applications/[clientId]/route.ts"
    "src/app/api/ai-apply/application/[id]/route.ts"
    "src/app/api/debug-auth/route.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Fixing $file"
        # Remove middleware imports
        sed -i '' '/import.*@\/lib\/middleware\//d' "$file"
        # Replace audit function calls with console.log
        sed -i '' 's/auditLog(/console.log(/g' "$file"
        sed -i '' 's/logAuthEvent(/console.log(/g' "$file"
        sed -i '' 's/logSecurityEvent(/console.log(/g' "$file"
    fi
done

echo "Import fixes completed"
