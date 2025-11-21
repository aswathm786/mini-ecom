# MongoDB Schema Initialization Script (PowerShell)
# Run this script to initialize all MongoDB collections and indexes

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath

Set-Location $projectRoot
npx ts-node --project scripts/tsconfig.json scripts/init_mongodb_schema.ts

