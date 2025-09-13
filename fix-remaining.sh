#!/bin/bash

# Fix remaining auth issues in API routes
cd apps/web

# Fix user references to decoded
find src/app/api -name "*.ts" -exec sed -i '' 's/user\.role/decoded.role/g' {} \;
find src/app/api -name "*.ts" -exec sed -i '' 's/user\.id/decoded.userId/g' {} \;
find src/app/api -name "*.ts" -exec sed -i '' 's/user\.email/decoded.email/g' {} \;

echo "Remaining auth fixes completed"
