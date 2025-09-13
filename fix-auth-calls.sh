#!/bin/bash

# Fix authMiddleware calls in API routes
cd apps/web

# Find all files with authMiddleware calls
files=$(find src/app/api -name "*.ts" -exec grep -l "authMiddleware" {} \;)

for file in $files; do
    echo "Fixing auth calls in $file"
    
    # Replace authMiddleware calls with direct JWT verification
    sed -i '' '
    /const authResult = await authMiddleware(request);/,/const user = authResult.user;/c\
        // Authenticate user\
        const authHeader = request.headers.get("authorization");\
        if (!authHeader || !authHeader.startsWith("Bearer ")) {\
            return NextResponse.json(\
                { success: false, error: "No valid authorization token" },\
                { status: 401 }\
            );\
        }\
        const token = authHeader.substring(7);\
        const decoded = verifyToken(token);
    ' "$file"
    
    # Add verifyToken import if not present
    if ! grep -q "verifyToken" "$file"; then
        sed -i '' '1i\
import { verifyToken } from "@/lib/utils/jwt";
' "$file"
    fi
done

echo "Auth calls fixes completed"
