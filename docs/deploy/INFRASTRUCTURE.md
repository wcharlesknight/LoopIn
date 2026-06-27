# LoopIn Deployment Infrastructure

**Version**: 1.0  
**Last Updated**: 2026-06-27  
**Target Deployment**: ASAP (This Week)  
**Budget**: Optimize for 1-20 users (AWS Free Tier + cost-conscious services)

---

## Table of Contents

1. [Infrastructure Architecture Overview](#infrastructure-architecture-overview)
2. [Cost Breakdown](#cost-breakdown)
3. [CI/CD Pipeline Design](#cicd-pipeline-design)
4. [Environment Setup Checklist](#environment-setup-checklist)
5. [Deployment Runbook](#deployment-runbook)
6. [Troubleshooting & Health Checks](#troubleshooting--health-checks)

---

## Infrastructure Architecture Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (iOS React Native)                                     │
│ - Built locally → uploaded to TestFlight                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────┐
        │ AWS API Gateway (REST API)               │
        │ - Base URL: https://api.gather.example   │
        │ - CORS enabled for iOS app               │
        │ - Auth via Bearer tokens (Firebase)      │
        └──────────────────┬───────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────┐
    │ AWS Lambda (gather-service)                  │
    │ - Compute: Java 21 runtime (x86_64)          │
    │ - Memory: 1024 MB (cost-optimized)           │
    │ - Timeout: 60 seconds                        │
    │ - Triggers: API Gateway + EventBridge        │
    └──────────────────┬───────────────────────────┘
                       │
         ┌─────────────┼──────────────┐
         ▼             ▼              ▼
    ┌─────────┐  ┌──────────┐   ┌──────────────┐
    │Firestore│  │DynamoDB* │   │EventBridge   │
    │(Firebase)  │(optional)│   │(Scheduled)   │
    └─────────┘  └──────────┘   └──────────────┘
         │
         ▼
    ┌────────────────┐
    │Firebase Cloud  │
    │Messaging (FCM) │
    └────────────────┘
```

*DynamoDB is optional; Firestore is primary due to existing Firebase integration

### AWS Services Stack

#### 1. **API Gateway (REST)**
- **Purpose**: HTTP endpoint for iOS client to call backend
- **Configuration**:
  - Resource: `/api/*`
  - Methods: GET, POST, PUT, DELETE
  - CORS: Allow origin `*` (or restrict to your TestFlight bundle)
  - Authentication: Custom authorizer (Firebase token validation)
  - Timeout: 29 seconds (Lambda 60s timeout - 1s buffer)
- **Cost**: $0.00 (free tier: 1M requests/month)

#### 2. **AWS Lambda (Java 21)**
- **Purpose**: Runs gather-service Spring Boot application
- **Configuration**:
  - Runtime: Java 21 (`java21.x`)
  - Memory: 1024 MB (balanced cost/performance for Java)
  - Ephemeral storage: 512 MB default
  - Timeout: 60 seconds
  - Environment variables:
    - `SPRING_PROFILES_ACTIVE=lambda` (active Spring profile)
    - `GOOGLE_PLACES_API_KEY=<your-key>`
    - `FIREBASE_CREDENTIALS_PATH=/var/task/firebase-service-account.json`
  - Layers: AWS Lambda Insights (optional, for monitoring)
  - VPC: Optional (Firestore accessible via public internet)
- **Cost**: ~$0.20-0.50/month for 1-20 users (free tier: 1M invocations/month)

#### 3. **Firestore (Firebase)**
- **Purpose**: Primary NoSQL database (existing integration)
- **Collections**:
  - `cities` - City job configurations
  - `gatheringSpots` - Weekly selected spot records
  - `users` - User profiles (location, preferences)
- **Read/Write Quotas** (Free Tier):
  - 50,000 reads/day
  - 20,000 writes/day
  - 1 GB stored data
- **Cost**: $0.00 (free tier sufficient for 1-20 users)

#### 4. **EventBridge (Scheduled Job)**
- **Purpose**: Triggers the weekly gathering spot selection job
- **Rule Configuration**:
  - Schedule: Cron `cron(0 9 ? * THU *)` (9 AM UTC, Thursdays)
  - Target: Lambda function
  - Input: Static JSON payload (optional)
- **Cost**: $0.00 (free tier: 14 invocations/month sufficient)

#### 5. **CloudWatch Logs**
- **Purpose**: Centralized logging for Lambda execution and errors
- **Retention**: 14 days (default, cost-effective)
- **Cost**: $0.00 (free tier: 5 GB/month)

#### 6. **Firebase Cloud Messaging (FCM)**
- **Purpose**: Push notifications to iOS users
- **Integration**: Existing Firebase project setup
- **Cost**: $0.00 (free tier)

---

## Cost Breakdown

### Monthly Estimated Costs (1-20 Users)

| Service | Usage | Cost | Notes |
|---------|-------|------|-------|
| **API Gateway** | 1M requests/month | $0.00 | Free tier (1M req) |
| **Lambda** | 30,000 invocations/month | $0.00-0.20 | Free tier (1M invocations) |
| **Firestore** | ~5K reads/writes | $0.00 | Free tier (50K reads/20K writes) |
| **EventBridge** | 4 invocations/month | $0.00 | Free tier (14 rule invocations) |
| **CloudWatch Logs** | ~10 MB logs/month | $0.00 | Free tier (5 GB) |
| **Firebase Hosting** | N/A | $0.00 | Not needed (mobile app) |
| **Bandwidth** | ~100 MB egress | ~$0.01 | Minimal outbound |
| **Total** | | **$0.01-0.21/month** | Stays in free tier |

### Why This Stack Over Alternatives?

| Alternative | Trade-off |
|---|---|
| **EC2 + RDS** | Higher cost (~$10-50/month), more ops burden, overkill for 1-20 users |
| **Fargate** | Simpler than EC2 but costlier than Lambda (~$5-20/month for always-on) |
| **DynamoDB** | Adequate but less flexible; Firestore already integrated with Firebase auth |
| **Heroku** | Deprecated free tier; now $7/month minimum |
| **Lightsail** | Fixed $5/month might be competitive if always-on preferred, but Lambda is free |

---

## CI/CD Pipeline Design

### GitHub Actions Workflows

#### 1. iOS App Deployment → TestFlight

**Workflow File**: `.github/workflows/ios-testflight.yml`

**Triggers**:
- Push to branch `main` (automatic)
- Manual dispatch (for on-demand builds)

**Steps**:
1. Checkout code
2. Setup Node.js + cache dependencies
3. Install iOS dependencies (CocoaPods)
4. Increment build number
5. Build React Native app for iOS
6. Sign & export to .ipa
7. Upload to TestFlight via Xcode API
8. Notify team (Slack webhook)

**Secrets Required**:
- `APPLE_ID` - Apple ID email
- `APPLE_ID_PASSWORD` - App-specific password (2FA)
- `CERTIFICATE_BASE64` - Distribution certificate (base64 encoded)
- `CERTIFICATE_PASSWORD` - Certificate password
- `PROVISIONING_PROFILE_BASE64` - Provisioning profile (base64)
- `SLACK_WEBHOOK_URL` - Optional, for notifications

**Example Configuration**:
```yaml
name: iOS Build → TestFlight

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-upload:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Pods
        run: cd ios && pod install
      
      - name: Increment build number
        run: |
          cd ios
          agvtool new-version -all $(($(agvtool what-version -terse) + 1))
      
      - name: Import signing certificate
        run: |
          echo "${{ secrets.CERTIFICATE_BASE64 }}" | base64 -d > cert.p12
          security import cert.p12 -P "${{ secrets.CERTIFICATE_PASSWORD }}" -A
      
      - name: Build & Export for TestFlight
        run: |
          xcodebuild -workspace ios/LoopIn.xcworkspace \
            -scheme LoopIn \
            -configuration Release \
            -archivePath build/LoopIn.xcarchive \
            archive
          
          xcodebuild -exportArchive \
            -archivePath build/LoopIn.xcarchive \
            -exportOptionsPlist ios/ExportOptions.plist \
            -exportPath build/export
      
      - name: Upload to TestFlight
        run: |
          xcrun altool --upload-app \
            --file build/export/LoopIn.ipa \
            --username "${{ secrets.APPLE_ID }}" \
            --password "@keychain:altool-app-password" \
            --app-type ios
      
      - name: Slack notification
        if: always()
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
            -H 'Content-Type: application/json' \
            -d '{"text":"iOS TestFlight build: ${{ job.status }}"}'
```

---

#### 2. Backend Deployment → Lambda

**Workflow File**: `.github/workflows/deploy-lambda.yml`

**Triggers**:
- Push to branch `main` (automatic)
- Manual dispatch with environment selection (dev/prod)

**Steps**:
1. Checkout code
2. Setup Java 21
3. Build JAR with Gradle
4. Package as Lambda ZIP (with dependencies)
5. Update Lambda function code
6. Run health check (wait for API healthy)
7. Notify team

**Secrets Required**:
- `AWS_ACCESS_KEY_ID` - IAM user for Lambda deployment
- `AWS_SECRET_ACCESS_KEY` - IAM secret key
- `GOOGLE_PLACES_API_KEY` - Google Places API key
- `FIREBASE_CREDENTIALS` - Firebase service account JSON (base64)
- `SLACK_WEBHOOK_URL` - Optional

**Example Configuration**:
```yaml
name: Deploy gather-service → Lambda

on:
  push:
    branches: [main]
    paths:
      - 'gather-service/**'
      - '.github/workflows/deploy-lambda.yml'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'dev'
        type: choice
        options:
          - dev
          - prod

env:
  LAMBDA_FUNCTION_NAME: gather-service-${{ github.ref_name }}
  AWS_REGION: us-east-1

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Java 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: gradle
      
      - name: Build JAR
        working-directory: gather-service
        run: |
          ./gradlew clean build -x test \
            -Dspring.profiles.active=lambda
      
      - name: Prepare Lambda package
        run: |
          mkdir -p lambda-package
          cp gather-service/build/libs/gather-service-*.jar lambda-package/
          
          # Decode Firebase credentials
          echo "${{ secrets.FIREBASE_CREDENTIALS }}" | base64 -d \
            > lambda-package/firebase-service-account.json
          
          cd lambda-package && zip -r ../lambda.zip . && cd ..
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Update Lambda function
        run: |
          aws lambda update-function-code \
            --function-name ${{ env.LAMBDA_FUNCTION_NAME }} \
            --zip-file fileb://lambda.zip
          
          aws lambda update-function-configuration \
            --function-name ${{ env.LAMBDA_FUNCTION_NAME }} \
            --environment "Variables={GOOGLE_PLACES_API_KEY=${{ secrets.GOOGLE_PLACES_API_KEY }},SPRING_PROFILES_ACTIVE=lambda}"
      
      - name: Wait for update
        run: sleep 10
      
      - name: Health check
        run: |
          HEALTH_ENDPOINT="https://api.gather.example/api/health"
          for i in {1..5}; do
            if curl -f "$HEALTH_ENDPOINT"; then
              echo "✓ API is healthy"
              exit 0
            fi
            echo "Attempt $i failed, retrying..."
            sleep 5
          done
          echo "✗ API health check failed"
          exit 1
      
      - name: Slack notification
        if: always()
        run: |
          STATUS="${{ job.status }}"
          curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"Lambda deployment: $STATUS (commit: ${{ github.sha }}))\"}"
```

---

#### 3. Database Migration (Optional, on-demand)

**Workflow File**: `.github/workflows/db-migration.yml`

**Triggers**: Manual dispatch only (safety first)

**Steps**:
1. Authenticate to AWS
2. Run migration script against Firestore/DynamoDB
3. Log results
4. Rollback on failure

**Note**: Firestore uses Firebase Admin SDK and is schema-flexible, so migrations are typically application-code driven. This workflow is a safety net for bulk data operations.

---

### Secrets Configuration

Add these to GitHub repository settings → Secrets and variables → Actions:

| Secret | Source | Rotation |
|--------|--------|----------|
| `AWS_ACCESS_KEY_ID` | AWS IAM console | Every 90 days |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM console | Every 90 days |
| `APPLE_ID` | Apple Developer account | As needed |
| `APPLE_ID_PASSWORD` | Apple Developer (app-specific) | As needed |
| `CERTIFICATE_BASE64` | Keychain export (base64) | When cert expires (~yearly) |
| `PROVISIONING_PROFILE_BASE64` | Apple Dev portal (base64) | When profile expires (~yearly) |
| `GOOGLE_PLACES_API_KEY` | Google Cloud Console | Monitor usage, rotate if compromised |
| `FIREBASE_CREDENTIALS` | Firebase console (base64) | When key expires (~yearly) |
| `SLACK_WEBHOOK_URL` | Slack app config | As needed |

**Security Best Practices**:
- Use fine-grained IAM roles (least privilege)
- Rotate credentials every 90 days
- Use organization-level secrets, not repository-level
- Enable branch protection (require approval before deploy to prod)

---

## Environment Setup Checklist

### Phase 1: AWS Account Setup (30 mins)

- [ ] Create AWS account or use existing
- [ ] Enable billing alerts (set to $10/month to catch surprises)
- [ ] Create IAM user for CI/CD deployments:
  - Name: `github-actions-deployer`
  - Attach policy: Custom inline policy with Lambda, API Gateway, CloudWatch permissions (see below)
  - Generate access key + secret key
  - Save credentials securely

**IAM Policy** (minimal permissions):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:GetFunction"
      ],
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT_ID:function/gather-service-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "apigateway:GET",
        "apigateway:POST",
        "apigateway:PUT",
        "apigateway:DELETE"
      ],
      "Resource": "arn:aws:apigateway:us-east-1::/restapis/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:GetLogEvents",
        "logs:FilterLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:ACCOUNT_ID:log-group:/aws/lambda/gather-service-*"
    }
  ]
}
```

### Phase 2: Lambda Function Setup (45 mins)

- [ ] Create Lambda function:
  - Name: `gather-service-main`
  - Runtime: `java21.x`
  - Architecture: `x86_64`
  - Memory: `1024` MB
  - Timeout: `60` seconds
  - Ephemeral storage: `512` MB (default)

- [ ] Create Lambda execution role:
  - Name: `gather-service-lambda-role`
  - Trust: `lambda.amazonaws.com`
  - Permissions:
    - `CloudWatchLogsFullAccess` (for logging)
    - Firestore/Firebase access (handled via Firebase Admin SDK with embedded credentials)

- [ ] Set environment variables:
  ```bash
  SPRING_PROFILES_ACTIVE=lambda
  GOOGLE_PLACES_API_KEY=<your-key>
  FIREBASE_CREDENTIALS_PATH=/var/task/firebase-service-account.json
  ```

- [ ] Configure timeout + memory based on load testing (start with 1024 MB)

### Phase 3: API Gateway Setup (45 mins)

- [ ] Create REST API:
  - Name: `gather-api`
  - Endpoint type: Regional (us-east-1)

- [ ] Create resource hierarchy:
  ```
  / (root)
  ├── api
  │   ├── auth
  │   │   ├── register (POST)
  │   │   └── login (POST)
  │   ├── users (PUT, GET)
  │   │   └── location (PUT)
  │   ├── cities (GET, POST)
  │   │   └── {id} (GET, PUT, DELETE)
  │   └── gathering-spots
  │       ├── city (GET)
  │       │   └── {cityId}
  │       │       ├── recent (GET)
  │       │       └── recent-ids (GET)
  └── health (GET)
  ```

- [ ] Add Lambda integration for all methods → target: `gather-service-main` function

- [ ] Enable CORS:
  - Access-Control-Allow-Origin: `*` (or restrict to iOS bundle ID)
  - Access-Control-Allow-Methods: `GET, POST, PUT, DELETE, OPTIONS`
  - Access-Control-Allow-Headers: `Content-Type, Authorization`

- [ ] Configure CloudWatch logging:
  - Log level: INFO (set to ERROR in production)
  - Format: JSON (for easy parsing)

- [ ] Deploy to stage:
  - Stage name: `prod` or `dev`
  - Invoke URL will be: `https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/`

### Phase 4: EventBridge Setup (15 mins)

- [ ] Create EventBridge rule:
  - Name: `weekly-gathering-spot-sync`
  - Schedule pattern: `cron(0 9 ? * THU *)` (9 AM UTC, Thursdays)
  - Target: Lambda function `gather-service-main`
  - Input: 
    ```json
    {
      "source": "eventbridge",
      "triggerType": "scheduled-job"
    }
    ```

- [ ] Ensure Lambda execution role trusts `events.amazonaws.com`

- [ ] Test rule manually (invoke once to verify)

### Phase 5: Firebase & Firestore (Already Configured)

- [ ] Verify Firestore collections exist:
  - `cities` (job configurations)
  - `gatheringSpots` (weekly selections)
  - `users` (user profiles)

- [ ] Download Firebase service account JSON:
  - Go to Firebase Console → Project Settings → Service Accounts
  - Generate new private key
  - Save as `firebase-service-account.json`
  - **Base64 encode for GitHub Secrets**: `base64 -i firebase-service-account.json`

- [ ] Verify Firebase Auth enabled (Email/Password provider)

- [ ] Set up FCM topic: `weekly-gather` (default in application.yml)

### Phase 6: GitHub Actions Setup (30 mins)

- [ ] Copy workflow files to `.github/workflows/`:
  - `ios-testflight.yml`
  - `deploy-lambda.yml`

- [ ] Add GitHub Secrets (Repo Settings → Secrets and variables → Actions):
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `GOOGLE_PLACES_API_KEY`
  - `FIREBASE_CREDENTIALS` (base64 encoded JSON)
  - `APPLE_ID`
  - `APPLE_ID_PASSWORD`
  - `CERTIFICATE_BASE64`
  - `PROVISIONING_PROFILE_BASE64`
  - `SLACK_WEBHOOK_URL` (optional)

- [ ] Enable branch protection on `main`:
  - Require PR reviews: Yes (1 reviewer)
  - Require status checks to pass: Yes
  - Status checks: Lambda build + tests

### Phase 7: Monitoring & Alerts (20 mins)

- [ ] CloudWatch Alarms:
  - Lambda error rate > 5%
  - Lambda duration > 45s
  - API Gateway 5xx errors > 1%
  - Firestore quota exceeded

- [ ] Set alarm action → SNS topic → Email notification

- [ ] Create CloudWatch Dashboard:
  - Lambda invocations (daily view)
  - API Gateway latency (p50, p90, p99)
  - Error logs (recent errors)
  - Cost trend (if needed)

---

## Deployment Runbook

### Pre-Deployment Checklist

```bash
# 1. Verify all tests pass locally
cd /Users/charlieknight/Projects/LoopIn
npm test

# 2. Verify gather-service builds
cd /Users/charlieknight/Projects/gather-service
./gradlew clean build

# 3. Check for hardcoded secrets
grep -r "password\|api_key\|secret" --include="*.ts" --include="*.java" .
# Should find none (all in .env or GitHub Secrets)

# 4. Verify branch is up-to-date with main
git fetch origin
git status  # should show "Your branch is up to date"

# 5. Create feature branch (if making changes)
git checkout -b feature/deployment-setup
```

### Deploy Backend to Lambda

#### Option A: Automatic (GitHub Actions)

1. Create a PR with backend changes → merge to `main`
2. GitHub Actions workflow `.github/workflows/deploy-lambda.yml` runs automatically
3. Monitor deployment:
   ```bash
   # In GitHub: Actions tab → deploy-lambda workflow
   # Check logs for success message
   ```
4. Verify API is healthy:
   ```bash
   curl https://api.gather.example/api/health
   # Expected: {"status":"UP"}
   ```

#### Option B: Manual (CLI)

```bash
#!/bin/bash
set -e

# 1. Build JAR
cd ~/Projects/gather-service
./gradlew clean build -x test -Dspring.profiles.active=lambda
JAR_FILE=$(find build/libs -name "*.jar" | head -1)
echo "Built: $JAR_FILE"

# 2. Prepare Lambda package
mkdir -p /tmp/lambda-package
cp "$JAR_FILE" /tmp/lambda-package/
cp firebase-service-account.json /tmp/lambda-package/
cd /tmp/lambda-package && zip -r lambda.zip . && cd -

# 3. Authenticate AWS (assumes credentials in ~/.aws/credentials)
export AWS_PROFILE=default
export AWS_REGION=us-east-1

# 4. Update Lambda function
aws lambda update-function-code \
  --function-name gather-service-main \
  --zip-file fileb:///tmp/lambda-package/lambda.zip

# 5. Wait for update + set environment variables
sleep 5
aws lambda update-function-configuration \
  --function-name gather-service-main \
  --environment "Variables={GOOGLE_PLACES_API_KEY=$(cat ~/.env | grep GOOGLE_PLACES_API_KEY),SPRING_PROFILES_ACTIVE=lambda}"

# 6. Health check
echo "Waiting for Lambda to update..."
sleep 10
HEALTH_ENDPOINT="https://api.gather.example/api/health"
if curl -f "$HEALTH_ENDPOINT"; then
  echo "✓ Deployment successful"
else
  echo "✗ Health check failed - rolling back"
  # Trigger rollback (use previous version)
  exit 1
fi
```

**Expected Output**:
```
Built: gather-service/build/libs/gather-service-1.0.0-SNAPSHOT.jar
{
    "FunctionName": "gather-service-main",
    "FunctionArn": "arn:aws:lambda:us-east-1:...",
    "CodeSize": 157385829,
    "UpdateStatus": "InProgress"
}
Waiting for Lambda to update...
✓ Deployment successful
```

### Build & Upload iOS App to TestFlight

#### Option A: Automatic (GitHub Actions)

1. Create a PR with frontend changes → merge to `main`
2. GitHub Actions workflow `.github/workflows/ios-testflight.yml` runs automatically
3. Monitor build:
   - GitHub Actions tab → ios-testflight workflow
   - Wait for "Upload to TestFlight" step
4. Verify in TestFlight:
   - Open TestFlight app on iOS device
   - Check for new build notification
   - Test new features

#### Option B: Manual (Xcode)

```bash
#!/bin/bash
set -e

cd ~/Projects/LoopIn

# 1. Install dependencies
npm ci
cd ios && pod install && cd ..

# 2. Increment build number
cd ios
CURRENT_BUILD=$(agvtool what-version -terse)
NEW_BUILD=$((CURRENT_BUILD + 1))
agvtool new-version -all "$NEW_BUILD"
echo "Incremented build to $NEW_BUILD"

# 3. Build archive
xcodebuild -workspace LoopIn.xcworkspace \
  -scheme LoopIn \
  -configuration Release \
  -derivedDataPath ./DerivedData \
  -archivePath ./DerivedData/LoopIn.xcarchive \
  archive

# 4. Export to IPA
xcodebuild -exportArchive \
  -archivePath ./DerivedData/LoopIn.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath ./DerivedData/export

# 5. Upload to TestFlight
# (Requires Apple Developer credentials + app-specific password)
xcrun altool --upload-app \
  --file ./DerivedData/export/LoopIn.ipa \
  --username "$APPLE_ID" \
  --password "@keychain:altool-app-password" \
  --app-type ios

echo "✓ Build uploaded to TestFlight"
echo "Check TestFlight app on iOS device for new build notification"
```

---

### Database Migrations (Firestore)

Firestore is schema-flexible, so most changes happen at application code level. For bulk operations:

```bash
#!/bin/bash
set -e

# 1. Create backup (if needed)
# Firebase Console → Firestore → Backups → Create Backup

# 2. Run migration script
cd ~/Projects/gather-service
java -cp build/libs/gather-service-*.jar com.gather.migration.MigrationRunner

# 3. Verify migration
curl https://api.gather.example/api/health
curl https://api.gather.example/api/cities

echo "✓ Migration complete"
```

---

### Rollback Procedures

#### Lambda Rollback

```bash
#!/bin/bash

FUNCTION_NAME="gather-service-main"
AWS_REGION="us-east-1"

# 1. Get previous version alias (if using Lambda versions)
VERSION=$(aws lambda list-versions-by-function \
  --function-name "$FUNCTION_NAME" \
  --query 'Versions[-2].Version' \
  --output text)

# 2. Rollback to previous version
aws lambda update-alias \
  --function-name "$FUNCTION_NAME" \
  --name prod \
  --function-version "$VERSION"

echo "Rolled back to version: $VERSION"

# 3. Health check
sleep 5
curl https://api.gather.example/api/health
```

#### iOS Rollback

1. **Pre-Release**: If TestFlight build not yet released, simply don't submit for review
2. **In-Production**: Use TestFlight to revert to previous build:
   - TestFlight → Version History → Select previous version
   - Mark current build as "Remove from Testing"
   - Users will auto-update to stable version

#### Firestore Rollback

1. Firebase Console → Firestore → Backups → Restore from backup
2. Select checkpoint before bad migration
3. Restore to new database (if production), then switch traffic

---

### Health Checks

#### API Health Endpoint

```bash
#!/bin/bash

API_BASE="https://api.gather.example"

echo "Testing API endpoints..."

# 1. Health check
curl -s "$API_BASE/api/health" | jq .
# Expected: {"status":"UP"}

# 2. Cities list (no auth)
curl -s "$API_BASE/api/cities" | jq .
# Expected: Array of city objects

# 3. Auth endpoint (mock login)
curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Authorization: Bearer mock-token" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
# Expected: 200 or auth error

echo "✓ API is healthy"
```

#### Lambda CloudWatch Logs

```bash
#!/bin/bash

LOG_GROUP="/aws/lambda/gather-service-main"
REGION="us-east-1"

# Get last 100 log lines
aws logs tail "$LOG_GROUP" \
  --region "$REGION" \
  --follow \
  --format short \
  --max-items 100
```

#### Monitor Real-Time Metrics

```bash
#!/bin/bash

# Lambda invocations + errors (last 5 minutes)
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=gather-service-main \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=gather-service-main \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

---

## Troubleshooting & Health Checks

### Common Issues

#### 1. Lambda Timeout (504 Gateway Timeout)

**Symptom**: API calls return 504 after ~30 seconds

**Cause**: Spring Boot startup slow on cold start, or business logic exceeds timeout

**Fix**:
- Increase Lambda timeout to 120 seconds
- Warm up Lambda with scheduled pings every 5 minutes (CloudWatch rule)
- Or use Lambda provisioned concurrency (costs extra, use if cold starts critical)

```bash
aws lambda update-function-configuration \
  --function-name gather-service-main \
  --timeout 120
```

#### 2. Firebase Credentials Not Found

**Symptom**: Lambda logs show `firebase-service-account.json not found`

**Cause**: Credentials file not included in Lambda ZIP

**Fix**: Ensure `firebase-service-account.json` is in root of ZIP before uploading

```bash
unzip -l lambda.zip | grep firebase-service-account
# Should see the file listed
```

#### 3. API Gateway CORS Error

**Symptom**: iOS app shows CORS error in Network tab

**Cause**: API Gateway CORS not configured

**Fix**: Enable CORS in API Gateway

```bash
aws apigateway put-integration-response \
  --rest-api-id <api-id> \
  --resource-id <resource-id> \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
  --response-templates '{"application/json":""}'
```

#### 4. Firestore Permission Denied

**Symptom**: Lambda logs show `PERMISSION_DENIED` on Firestore reads/writes

**Cause**: Firebase service account credentials invalid or Firestore security rules too strict

**Fix**:
- Verify Firebase service account has Firestore permissions
- Check Firestore security rules (should allow service account):
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }
  ```

#### 5. EventBridge Job Not Triggering

**Symptom**: Weekly gathering spot not updated on Thursday

**Cause**: EventBridge rule disabled, or Lambda permission missing

**Fix**:
- Enable EventBridge rule:
  ```bash
  aws events enable-rule --name weekly-gathering-spot-sync
  ```
- Check Lambda permission:
  ```bash
  aws lambda get-policy --function-name gather-service-main
  # Should show statement allowing events.amazonaws.com
  ```

---

### Performance Baselines

Target metrics for 1-20 users:

| Metric | Target | Alert Threshold |
|--------|--------|---|
| API latency (p50) | < 100ms | > 500ms |
| API latency (p99) | < 1000ms | > 3000ms |
| Lambda cold start | < 30s | N/A |
| Lambda warm latency | < 100ms | > 500ms |
| API error rate | < 1% | > 5% |
| Firestore reads/day | < 10K | > 30K (approaching limit) |
| Firestore writes/day | < 5K | > 15K (approaching limit) |
| Daily cost | $0.01-0.21 | > $1.00 |

---

### Support & Escalation

**If deployment fails**:
1. Check CloudWatch logs: `aws logs tail /aws/lambda/gather-service-main --follow`
2. Verify all GitHub Secrets are set
3. Check AWS IAM permissions for CI/CD user
4. Verify Firebase credentials are valid (not expired)

**For 24/7 support**:
- AWS Support: aws.amazon.com/support (requires Business plan, ~$100/month)
- Firebase Support: firebase.google.com/support (free for Spark plan)
- For this project scope: Use CloudWatch alarms + Slack notifications for early warning

---

## Quick Reference

### Deploy Backend
```bash
# Automatic (recommended)
git push origin main
# GitHub Actions handles deployment

# Or manual
cd ~/Projects/gather-service && ./gradlew clean build && aws lambda update-function-code --function-name gather-service-main --zip-file fileb:///tmp/lambda.zip
```

### Deploy iOS App
```bash
# Automatic
git push origin main
# GitHub Actions builds + uploads to TestFlight

# Or manual (in Xcode): Product → Archive → Upload to App Store → TestFlight
```

### Check Logs
```bash
aws logs tail /aws/lambda/gather-service-main --follow
```

### Run Weekly Gathering Job (Manual)
```bash
aws events put-events --entries file://event.json
# Where event.json triggers the EventBridge rule
```

---

**Document Version**: 1.0  
**Last Review**: 2026-06-27  
**Next Review**: After first deployment (record learnings)
