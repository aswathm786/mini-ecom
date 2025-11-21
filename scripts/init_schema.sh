#!/bin/bash
# MongoDB Schema Initialization Script
# Run this script to initialize all MongoDB collections and indexes

cd "$(dirname "$0")/.."
npx ts-node --project scripts/tsconfig.json scripts/init_mongodb_schema.ts

