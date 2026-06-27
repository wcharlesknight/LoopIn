# Deployment Quick Start (TL;DR)

**Start Date**: 2026-06-27  
**Target**: TestFlight + AWS by 2026-07-01  
**Your Role**: Solo execution (infrastructure + code)

---

## The 5-Day Timeline

| Day | Focus | Main Task | By End of Day |
|-----|-------|-----------|----------------|
| **Fri 6/27** | AWS Infra | Set up RDS, API Gateway, Secrets Manager | Infrastructure ready, no code deployed yet |
| **Sat 6/28** | Backend Deploy | Deploy gather-service JAR to Lambda/EC2, run migrations | Backend running on AWS, API endpoints respond |
| **Sun 6/29** | Backend Test | Test all 5 main API endpoints with curl/Postman | All endpoints working, no errors in logs |
| **Mon 6/30** | iOS Build | Update BACKEND_URL to AWS, build & archive for TestFlight | Xcode archive ready to upload |
| **Tue 7/01** | TestFlight | Upload to TestFlight, invite testers, verify first sign-up | Build in TestFlight, at least 1 user signed up |

---

## Immediate To-Dos (Today)

### 1. AWS Account Setup (< 30 min)
```bash
# Ensure you have:
- AWS Console access
- RDS creation permissions
- Lambda/API Gateway/Secrets Manager access
- Credit card on file (for charges)
```

### 2. Code Review (< 1 hour)
```bash
# Check what exists:
ls -la /Users/charlieknight/Projects/gather-service/  # Backend (Java/Spring Boot)
cat /Users/charlieknight/Projects/LoopIn/constants/api.ts  # Currently points to localhost:8080
cat /Users/charlieknight/Projects/LoopIn/ios/LoopIn/Info.plist  # iOS config
```

### 3. Prepare for Day 1
- [ ] Read `/Users/charlieknight/Projects/LoopIn/docs/deploy/DEPLOYMENT_PLAN.md` (502 lines, 20-30 min)
- [ ] Bookmark gather-service main files:
  - Controllers: `/Users/charlieknight/Projects/gather-service/src/main/java/com/gather/controller/`
  - Config: `/Users/charlieknight/Projects/gather-service/src/main/resources/application.yml`
  - Build: `/Users/charlieknight/Projects/gather-service/build.gradle`
- [ ] Have Xcode open, familiar with signing config

---

## Critical Path (Unblock by EOD)

### Fri (Day 1)
**Must have by 5 PM:**
- [ ] RDS PostgreSQL running (save endpoint URL)
- [ ] Secrets Manager entries created (4 total: db-password, google-api-key, resend-key, firebase-json)
- [ ] API Gateway created (basic structure)

**If blocked:** RDS creation takes ~15 min. Parallelized APIs while waiting.

---

### Sat (Day 2)
**Must have by 5 PM:**
- [ ] Migrations run, tables exist in RDS
- [ ] gather-service JAR built & deployed (Lambda or EC2)
- [ ] `curl https://<api-gateway>/api/cities` returns 200 (or auth error, that's OK)

**If blocked:** Java build fails? Check Java 21, gradle cache. Deploy fails? Check IAM, env vars in CloudWatch.

---

### Sun (Day 3)
**Must have by 5 PM:**
- [ ] POST /api/auth/register works (returns custom token)
- [ ] POST /api/auth/login works
- [ ] GET /api/cities returns list
- [ ] PUT /api/users/location accepts requests
- [ ] No critical errors in CloudWatch logs

**If blocked:** API 500s? Check Secrets Manager access, RDS connection string, Firebase credentials.

---

### Mon (Day 4)
**Must have by 5 PM:**
- [ ] Update `constants/api.ts` with AWS endpoint
- [ ] Rebuild iOS app locally, test against AWS backend
- [ ] Xcode archive succeeds without code signing errors
- [ ] Have `.xcarchive` file ready

**If blocked:** Code signing fail? Check Apple Developer account, team ID in Xcode. Pod install fail? `pod install --repo-update`.

---

### Tue (Day 5)
**Must have by 5 PM:**
- [ ] Build uploaded to TestFlight (available in ~30 min to 1 hour)
- [ ] At least 1 person (you) installs app and signs up via Google
- [ ] User appears in database
- [ ] CloudWatch shows no critical errors

**If blocked:** TestFlight upload rejected? Check build version, signing cert, bundle ID. App crashes? Debug in Xcode Console.

---

## Key Files to Know

| File | Purpose | Action |
|------|---------|--------|
| `/Users/charlieknight/Projects/LoopIn/constants/api.ts` | Frontend API endpoint | Update BACKEND_URL on Day 4 |
| `/Users/charlieknight/Projects/LoopIn/ios/LoopIn/Info.plist` | iOS bundle config | Verify on Day 4 |
| `/Users/charlieknight/Projects/gather-service/src/main/resources/application.yml` | Backend config | Update DB connection on Day 2 |
| `/Users/charlieknight/Projects/gather-service/build.gradle` | Build config | Review on Day 1 |
| `/Users/charlieknight/Projects/LoopIn/docs/deploy/DEPLOYMENT_PLAN.md` | Full plan (detailed) | Reference entire week |

---

## Top 3 Risks to Watch

| Risk | Mitigation |
|------|-----------|
| **Apple Code Signing** — Xcode build fails with cert error | Pre-configure signing on Day 4; test on physical device |
| **RDS Connectivity** — Lambda can't reach database | Test connection locally before deploying; check security group |
| **TestFlight Review Delayed** — Build stuck "Processing" | Submit by 2 PM on Day 5; allows overnight review time |

---

## API Endpoints to Test (Day 3)

```bash
# List cities (no auth needed)
curl https://<api-gateway>/api/cities

# Register user
curl -X POST https://<api-gateway>/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","displayName":"Test User"}'

# Login (requires Firebase ID token from Auth Console)
curl -X POST https://<api-gateway>/api/auth/login \
  -H "Authorization: Bearer <id-token>"

# Update location (requires token)
curl -X PUT https://<api-gateway>/api/users/location \
  -H "Authorization: Bearer <id-token>" \
  -H "Content-Type: application/json" \
  -d '{"cityId":"seattle"}'
```

---

## Deployment Failure? Do This

1. **Check logs immediately**: `CloudWatch Logs > /aws/lambda/<function-name>` or EC2 system logs
2. **Identify the error**: Is it Java? Database? Config?
3. **Fix & redeploy**: Most issues fixed within 30 min
4. **Escalate if stuck 1+ hour**: Check DEPLOYMENT_PLAN.md "Troubleshooting" section

---

## Success Definition

✅ **You're done when:**
- iOS build in TestFlight (version 1.0.0, build 1)
- You can download + launch app on real iPhone
- You sign up via Google in app
- You see your user email in the database
- CloudWatch shows no errors
- At least 1 other person installs and signs up (optional for MVP)

---

## Questions During Deployment?

1. **Before starting a day**: Read the relevant section in `DEPLOYMENT_PLAN.md`
2. **Build/code issues**: Check project READMEs, Xcode build output, gradle build output
3. **AWS issues**: CloudWatch Logs first, then AWS documentation
4. **Stuck > 30 min**: Document the error, create GitHub issue, ask for help

---

## Communication Checklist

**Share with your team:**
- [ ] This document (QUICK_START.md)
- [ ] Full plan (DEPLOYMENT_PLAN.md)
- [ ] Final API endpoint URL (once deployed on Day 2)
- [ ] TestFlight link (once approved on Day 5)

---

**You've got this. 5 days, build momentum. Good luck!**
