# Pre-Deployment Validation Checklist
**Before Day 1 (2026-06-27) Begins**  
**Estimated Time**: 30-45 minutes  
**Goal**: Identify blockers early, avoid wasted time during deployment week

---

## Phase 1: Local Environment Check (10 min)

### Backend (gather-service)
- [ ] Java 21 installed: `java -version` (should show `21.x`)
- [ ] Gradle wrapper present: `ls /Users/charlieknight/Projects/gather-service/gradlew`
- [ ] Can build locally: `cd /Users/charlieknight/Projects/gather-service && ./gradlew build`
  - If fails, note error; may indicate Java/dependency issue before AWS deployment
- [ ] Git repo clean: `cd /Users/charlieknight/Projects/gather-service && git status`
  - No uncommitted changes that would interfere with deployment

### Frontend (iOS React Native)
- [ ] Node.js installed: `node --version` (should be >= 18)
- [ ] npm installed: `npm --version`
- [ ] React Native CLI: `npx react-native --version`
- [ ] Xcode installed: `xcode-select --print-path` (should not be empty)
- [ ] CocoaPods installed: `pod --version`
- [ ] Can install dependencies:
  ```bash
  cd /Users/charlieknight/Projects/LoopIn
  npm install  # Should complete without major errors
  ```
- [ ] iOS pods installed:
  ```bash
  cd /Users/charlieknight/Projects/LoopIn/ios
  bundle exec pod install  # Should complete
  ```

### Git
- [ ] Current branch is `main` or `additional-workups` (whichever is deployment branch):
  ```bash
  cd /Users/charlieknight/Projects/LoopIn
  git branch  # Check current branch
  git status  # Should be clean or minimal changes
  ```
- [ ] Recent commits exist: `git log --oneline -5` (sanity check)
- [ ] gather-service git clean: `cd /Users/charlieknight/Projects/gather-service && git status`

---

## Phase 2: Code Configuration Audit (15 min)

### Backend Configuration
- [ ] **Database**: Review current local DB setup
  ```bash
  grep -i "DATABASE_URL\|datasource" /Users/charlieknight/Projects/gather-service/src/main/resources/application*.yml
  ```
  - Note: This will need to change to RDS on Day 2

- [ ] **API Keys & Secrets**: Check what's currently in `.env`
  ```bash
  cat /Users/charlieknight/Projects/gather-service/.env
  ```
  - Should have: GOOGLE_PLACES_API_KEY, RESEND_API_KEY, FIREBASE_CREDENTIALS_PATH
  - These will move to AWS Secrets Manager on Day 1

- [ ] **Server Port**: Confirm it's 8080
  ```bash
  grep "server.port\|port:" /Users/charlieknight/Projects/gather-service/src/main/resources/application*.yml
  ```

- [ ] **CORS Settings**: Verify CORS is disabled or configured for mobile
  ```bash
  grep -A 5 "cors" /Users/charlieknight/Projects/gather-service/src/main/resources/application*.yml
  ```

- [ ] **Logging**: Check logging is not too verbose (affects performance)
  ```bash
  grep -A 10 "logging:" /Users/charlieknight/Projects/gather-service/src/main/resources/application*.yml
  ```

### Frontend Configuration
- [ ] **API Endpoint**: Currently points to localhost
  ```bash
  cat /Users/charlieknight/Projects/LoopIn/constants/api.ts
  # Should show: export const BACKEND_URL = 'http://localhost:8080';
  ```
  - This MUST be updated to AWS endpoint on Day 4

- [ ] **Firebase Config**: GoogleService-Info.plist exists and valid
  ```bash
  ls -l /Users/charlieknight/Projects/LoopIn/ios/LoopIn/GoogleService-Info.plist
  # Check it has project_id, api_key, etc.
  ```

- [ ] **Google Sign-In Client ID**: Matches Firebase config
  ```bash
  cat /Users/charlieknight/Projects/LoopIn/constants/auth.ts
  # Should show valid Google OAuth client ID
  ```

- [ ] **Bundle Identifier**: Matches Apple Developer account
  ```bash
  grep "CFBundleIdentifier" /Users/charlieknight/Projects/LoopIn/ios/LoopIn/Info.plist
  # Should be something like "com.yourteam.loopin"
  ```

---

## Phase 3: AWS Account Readiness (10 min)

### Access & Permissions
- [ ] AWS Account created and accessible: https://console.aws.amazon.com/
  - Can log in successfully
- [ ] IAM user or root account has permissions for:
  - RDS (create database)
  - Lambda (create functions, set env vars)
  - API Gateway (create REST API)
  - Secrets Manager (create secrets)
  - CloudWatch (view logs)
  - EC2 (if using EC2 instead of Lambda)

### Service Quotas
- [ ] Check RDS quota (ensure can create 1 database):
  - AWS Console > Service Quotas > search "RDS" > "Storage quota for DB instances"
  - Should show available quota

- [ ] Check Lambda quota (ensure can create 1 function):
  - AWS Console > Service Quotas > search "Lambda" > "Concurrent executions"
  - Should show available quota

- [ ] Billing alerts set up (optional but recommended):
  - AWS Console > Billing > Billing Preferences > set budget alert

### Prepared Credentials
- [ ] **Google Places API Key** ready:
  ```bash
  # Should exist in local .env or be prepared
  echo $GOOGLE_PLACES_API_KEY  # or check gather-service/.env
  ```
  - If not, get from Google Cloud Console (already should be, check with team)

- [ ] **Resend API Key** ready:
  ```bash
  grep RESEND_API_KEY /Users/charlieknight/Projects/gather-service/.env
  ```
  - Should not be empty; used for email notifications

- [ ] **Firebase Service Account JSON** ready:
  ```bash
  ls -l /Users/charlieknight/Projects/gather-service/src/main/resources/firebase-service-account.json
  ```
  - If not present, download from Firebase Console > Project Settings > Service Accounts

---

## Phase 4: Xcode & Apple Developer Setup (5 min)

### Xcode
- [ ] Xcode open successfully: `open /Applications/Xcode.app`
- [ ] Xcode version recent (14.x or later): `xcodebuild -version`
- [ ] Command Line Tools installed: `xcode-select --install` (if needed)

### Apple Developer Account
- [ ] Account created: https://developer.apple.com/account
  - Can log in successfully
- [ ] Team account or free account configured
- [ ] If team account: Verify team ID known
  - Can find in Xcode > Preferences > Accounts > Team
- [ ] Bundle identifier registered (or ready to register)
  - Xcode can auto-generate or use existing
- [ ] Signing certificate exists or can be created
  - Xcode may prompt to create on first build; allow it

### iOS Build Test
- [ ] Can build for simulator locally (quick test):
  ```bash
  cd /Users/charlieknight/Projects/LoopIn
  npm start &  # Start Metro in background
  sleep 5
  npx react-native run-ios --simulator="iPhone 15"  # Build for sim
  # Should build and launch in simulator
  ```
  - If fails: Check CocoaPods, pod install, Xcode setup
  - Kill Metro when done: `pkill -f Metro`

---

## Phase 5: Deployment Architecture Decision (5 min)

### Backend Hosting Choice: Lambda vs EC2

**Choose Lambda if:**
- [ ] Spring Boot app is stateless (no file system persistence)
- [ ] Cold starts acceptable (5-30 sec first invocation)
- [ ] You want minimal ops overhead
- **Decision**: Lambda

**Choose EC2 if:**
- [ ] Prefer consistent, warm startup times
- [ ] Want traditional server experience
- [ ] Plan to run other workloads on same instance
- **Decision**: EC2

**Recommendation**: Lambda for MVP (simpler). Document choice for Day 2.

### Database Choice: RDS PostgreSQL vs MySQL

**Recommend**: PostgreSQL (matches typical Prisma/Spring setup)
- [ ] Confirm this with backend team or schema
- [ ] Check if `prisma/schema.prisma` specifies provider
  ```bash
  grep "provider.*=" /Users/charlieknight/Projects/gather-service/prisma/schema.prisma 2>/dev/null || echo "Not using Prisma"
  ```

---

## Phase 6: Documentation Review (5 min)

### Ensure Deployment Guides Exist
- [ ] Main deployment plan exists: `/Users/charlieknight/Projects/LoopIn/docs/deploy/DEPLOYMENT_PLAN.md`
- [ ] Quick reference exists: `/Users/charlieknight/Projects/LoopIn/docs/deploy/QUICK_START.md`
- [ ] This checklist exists: `/Users/charlieknight/Projects/LoopIn/docs/deploy/PRE_DEPLOYMENT_VALIDATION.md`

### Backend README
- [ ] gather-service README has local setup instructions
  ```bash
  cat /Users/charlieknight/Projects/gather-service/README.md | head -50
  ```
  - Should document how to build, run, configure locally

### Frontend README
- [ ] LoopIn README has iOS setup instructions
  ```bash
  cat /Users/charlieknight/Projects/LoopIn/README.md | head -50
  ```
  - Should document npm install, pod install, running on simulator

---

## Phase 7: Day 1 Preparation (5 min)

### Set Aside Time on Friday
- [ ] Schedule 4-6 hours for Day 1 (infrastructure setup)
  - Not 2 hours; AWS takes time for DB to spin up
  - Start by 9-10 AM to maximize time before EOD

- [ ] Gather prerequisites:
  - [ ] AWS Console bookmark/tab open
  - [ ] Apple Developer Console bookmark/tab open
  - [ ] Terminal windows ready (one for backend, one for frontend)
  - [ ] Text editor for notes (keep deployment log)

### Create Deployment Log
- [ ] Create file: `/Users/charlieknight/Projects/LoopIn/docs/deploy/LOG.md`
  - This week, log what you do each day, blockers, solutions
  - Format:
    ```markdown
    # Deployment Log
    
    ## Fri 2026-06-27
    - 09:00 Start Day 1, AWS setup begins
    - 09:15 Create RDS instance
    - ... (more entries)
    ```

---

## Phase 8: Blockers Assessment

### If Any of These Are False, Address Before Day 1

- [ ] **Can build backend locally**: If gradle build fails, fix now (Java version? dependencies?)
- [ ] **Can build iOS locally for simulator**: If CocoaPods or Xcode fails, fix now
- [ ] **AWS account has RDS permissions**: If not, contact admin
- [ ] **Google Places API Key accessible**: If lost, generate new one from Google Cloud
- [ ] **Firebase service account JSON exists**: If not, download from Firebase Console
- [ ] **Bundle ID assigned in Apple Developer**: If not, create now to avoid Day 4 delays
- [ ] **Xcode signing certificate ready**: If not, Xcode will create on Day 4 (acceptable but risky)

### Red Flags (Escalate)
🔴 **If any of these are true, flag now:**
- Backend build fails for unknown reason (Java/gradle issue)
- iOS build fails with unexplained errors (Xcode/CocoaPods issue)
- AWS account locked or permission denied on key services
- Missing critical API keys (Google, Resend, Firebase)
- Bundle ID not registered in Apple Developer

---

## Completion Checklist

**Mark off as you complete each phase:**

- [ ] Phase 1: Local Environment (Java, Node, npm, Xcode, CocoaPods)
- [ ] Phase 2: Code Configuration (Backend config, Frontend API endpoint, Firebase)
- [ ] Phase 3: AWS Account (Access, Permissions, Credentials)
- [ ] Phase 4: Apple Developer (Account, Certificate, Bundle ID)
- [ ] Phase 5: Architecture Decision (Lambda vs EC2, PostgreSQL vs MySQL)
- [ ] Phase 6: Documentation Review (Plans, READMEs exist)
- [ ] Phase 7: Day 1 Preparation (Time blocked, log file created)
- [ ] Phase 8: No Blockers (All green, ready to start)

---

## Sign-Off

**By completing this checklist, you confirm:**

- ✅ All prerequisites met
- ✅ No known blockers
- ✅ Ready to start Day 1 (Fri 2026-06-27)
- ✅ Deployment plan reviewed and understood

**Checked by**: _________________  
**Date**: _________________  
**Time invested**: _____ minutes (target: 30-45)

---

## If Blocker Found

1. **Document it**: Write down the exact error
2. **Attempt fix**: Google, check README, ask in project Slack
3. **Escalate if stuck**: Create GitHub issue with label `deployment-blocker`
4. **Don't proceed to Day 1** until resolved (or have workaround documented)

---

**Ready to deploy? Start DEPLOYMENT_PLAN.md on Day 1!**
