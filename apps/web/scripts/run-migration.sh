#!/bin/bash

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
elif [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Run the migration
psql "$DATABASE_URL" -f scripts/fix-timestamps.sql

echo "Migration complete!"
