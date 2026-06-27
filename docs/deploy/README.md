# LoopIn Deployment Documentation

Welcome! This folder contains everything you need to deploy LoopIn to TestFlight + AWS.

**Start Date**: 2026-06-27  
**End Goal**: iOS app in TestFlight + backend on AWS  
**Timeline**: 1 Week (5 days of intense work)

---

## Where to Start?

### If you have < 5 minutes:
👉 **Read**: [`QUICK_START.md`](./QUICK_START.md)
- TL;DR of the entire deployment
- Day-by-day breakdown
- Critical path only
- Key files to know

### If you have 30-45 minutes (recommended before Day 1):
👉 **Complete**: [`PRE_DEPLOYMENT_VALIDATION.md`](./PRE_DEPLOYMENT_VALIDATION.md)
- Checklist to ensure you're ready
- Identifies blockers early
- Saves time during deployment week
- **Do this TODAY** (before Friday 6/27)

### If you have 1-2 hours (full reference):
👉 **Read**: [`DEPLOYMENT_PLAN.md`](./DEPLOYMENT_PLAN.md) (main document)
- Complete 11-section deployment plan
- Day-by-day tasks (Fri-Thu)
- Risk register with mitigations
- Rollback procedures
- Success criteria
- Troubleshooting reference
- **Read sections as needed during each day**

### If deploying infrastructure specifically:
👉 **Check**: [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md)
- RDS setup (PostgreSQL)
- API Gateway configuration
- Lambda vs EC2 decision tree
- Terraform/CloudFormation templates (if available)
- Networking & security groups

### If concerned about security:
👉 **Review**: [`SECURITY.md`](./SECURITY.md)
- Secrets management (Secrets Manager)
- Firebase security rules
- API authentication (Firebase tokens)
- HTTPS/TLS configuration
- Data protection best practices

---

## Document Map

| Document | Purpose | When to Read | Length |
|----------|---------|--------------|--------|
| **QUICK_START.md** | TL;DR version | Before starting OR when confused | 3 min |
| **PRE_DEPLOYMENT_VALIDATION.md** | Pre-flight checklist | Before Day 1 starts | 30-45 min |
| **DEPLOYMENT_PLAN.md** | Full deployment guide | Reference throughout week | 20-30 min |
| **INFRASTRUCTURE.md** | AWS/infra specifics | Day 1-2 (infrastructure setup) | 15-20 min |
| **SECURITY.md** | Security & secrets | Day 1, Day 3 (before frontend integration) | 15-20 min |
| **LOG.md** | Deployment journal (you create) | Fill in daily | Ongoing |

---

## The 5-Day Plan (One-Liner Version)

```
Day 1 (Fri)  → AWS infrastructure ready (RDS, API Gateway, Secrets Manager)
Day 2 (Sat)  → Backend deployed on AWS, database initialized
Day 3 (Sun)  → All API endpoints tested and working
Day 4 (Mon)  → iOS app updated and built for TestFlight
Day 5 (Tue)  → Build in TestFlight, first users signing up
```

**Full timeline in [`DEPLOYMENT_PLAN.md`](./DEPLOYMENT_PLAN.md#2-deployment-phases-day-by-day-for-this-week)**

---

## Key Decisions You Need to Make

1. **Backend Hosting**: Lambda or EC2?
   - Recommendation: Lambda (simpler for MVP)
   - Decision tree: See [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md#lambda-vs-ec2)

2. **Database**: PostgreSQL or MySQL?
   - Recommendation: PostgreSQL
   - Setup: See [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md#database-setup)

3. **Custom Domain**: Use API Gateway URL or custom domain?
   - For MVP: API Gateway URL is fine
   - Longer-term: Add custom domain later

---

## Critical Files in the Codebase

| File | What It Does | Update Day |
|------|--------------|-----------|
| `/Users/charlieknight/Projects/LoopIn/constants/api.ts` | Frontend API endpoint | Day 4 |
| `/Users/charlieknight/Projects/LoopIn/ios/LoopIn/Info.plist` | iOS bundle config | Verify Day 4 |
| `/Users/charlieknight/Projects/gather-service/src/main/resources/application.yml` | Backend config | Day 2 |
| `/Users/charlieknight/Projects/gather-service/build.gradle` | Backend build config | Reference Day 2 |
| `/Users/charlieknight/Projects/LoopIn/docs/deploy/LOG.md` | YOUR deployment log | Fill in daily |

---

## Quick Reference: API Endpoints to Test (Day 3)

After backend deployed, test these:

```bash
# Get list of cities (no auth)
GET /api/cities

# Register new user
POST /api/auth/register
{
  "email": "test@example.com",
  "password": "Test123!",
  "displayName": "Test User"
}

# Login with Firebase token
POST /api/auth/login
Headers: Authorization: Bearer <firebase-id-token>

# Update user location
PUT /api/users/location
Headers: Authorization: Bearer <firebase-id-token>
{
  "cityId": "seattle"
}

# Ensure profile exists
POST /api/users/ensure-profile
Headers: Authorization: Bearer <firebase-id-token>
```

See [`DEPLOYMENT_PLAN.md#8-troubleshooting-reference`](./DEPLOYMENT_PLAN.md#8-troubleshooting-reference) for detailed testing.

---

## Checklists

### Before Day 1 Starts
- [ ] Complete PRE_DEPLOYMENT_VALIDATION.md
- [ ] All sections marked ✅
- [ ] No blockers found
- [ ] Prepare deployment log file

### Each Day During Deployment
- [ ] Check DEPLOYMENT_PLAN.md section for that day
- [ ] Log progress in LOG.md
- [ ] Verify go/no-go gate at end of day
- [ ] Update status in GitHub or shared doc

### After Deployment (Day 6+)
- [ ] Archive build artifacts (JAR, .xcarchive)
- [ ] Update GitHub release tag
- [ ] Document lessons learned
- [ ] Plan Phase 2 (Android, scaling, features)

---

## Troubleshooting Quick Links

**Something's broken? Check:**

| Issue | Quick Fix |
|-------|-----------|
| "RDS won't connect" | Security group, check endpoint URL, try locally first |
| "Lambda times out" | Increase timeout to 30s, check RDS connection, try EC2 instead |
| "API returns 500" | Check CloudWatch logs, verify Secrets Manager access, check env vars |
| "iOS build fails" | Clean build folder (Cmd+Shift+K), pod install, check signing cert |
| "TestFlight stuck" | Wait up to 24h, or check Apple Developer console for review status |

**Detailed troubleshooting in [`DEPLOYMENT_PLAN.md#8-troubleshooting-reference`](./DEPLOYMENT_PLAN.md#8-troubleshooting-reference)**

---

## Success Criteria

**You're done when:**

- ✅ iOS build in TestFlight (version 1.0.0)
- ✅ Backend running on AWS (no errors in CloudWatch)
- ✅ At least 1 user can sign up via Google
- ✅ User profile visible in RDS database
- ✅ App doesn't crash on normal flows
- ✅ Team members can install from TestFlight

---

## Contact & Escalation

**Stuck for > 30 minutes?**
1. Check [`DEPLOYMENT_PLAN.md#8-troubleshooting-reference`](./DEPLOYMENT_PLAN.md#8-troubleshooting-reference)
2. Check project README for context
3. Review CloudWatch logs (AWS Console)
4. Document the issue in GitHub with label `deployment-blocker`

---

## Files in This Folder

```
/docs/deploy/
├── README.md                              ← You are here
├── QUICK_START.md                         ← Start here (TL;DR)
├── PRE_DEPLOYMENT_VALIDATION.md           ← Complete before Day 1
├── DEPLOYMENT_PLAN.md                     ← Reference all week
├── INFRASTRUCTURE.md                      ← AWS specifics
├── SECURITY.md                            ← Security & secrets
└── LOG.md                                 ← Create & update daily
```

---

## Timeline at a Glance

```
TODAY (Fri 6/27 before ~5 PM)
├─ Complete PRE_DEPLOYMENT_VALIDATION.md
├─ Review QUICK_START.md
└─ Create LOG.md

DAY 1 (Fri 6/27, ~5 hours)
├─ AWS: Create RDS, API Gateway, Secrets Manager
└─ Go/No-Go: Infrastructure ready?

DAY 2 (Sat 6/28, ~4 hours)
├─ Backend: Deploy JAR to AWS, run migrations
└─ Go/No-Go: Backend running?

DAY 3 (Sun 6/29, ~3 hours)
├─ Testing: Verify all 5 API endpoints
└─ Go/No-Go: All endpoints working?

DAY 4 (Mon 6/30, ~4 hours)
├─ iOS: Update BACKEND_URL, build archive
└─ Go/No-Go: Xcode archive ready?

DAY 5 (Tue 7/01, ~3 hours)
├─ TestFlight: Upload, verify first sign-up
└─ Go/No-Go: Build in TestFlight, users signing up?

DAYS 6-7 (Wed-Thu 7/02-7/03)
├─ Iteration: Fix issues from TestFlight
├─ Monitoring: Stable? No critical bugs?
└─ Documentation: Archive artifacts, write retrospective
```

---

## Starting Now?

### Step 1: Complete pre-deployment validation
```bash
open /Users/charlieknight/Projects/LoopIn/docs/deploy/PRE_DEPLOYMENT_VALIDATION.md
```

### Step 2: Create your deployment log
```bash
cat > /Users/charlieknight/Projects/LoopIn/docs/deploy/LOG.md << 'EOF'
# Deployment Log

## Fri 2026-06-27
- Start time: ___
- AWS infrastructure setup
- 

## Sat 2026-06-28
- Backend deployment
- 

## Sun 2026-06-29
- Backend testing
- 

## Mon 2026-06-30
- iOS build
- 

## Tue 2026-07-01
- TestFlight submission
- 

## Notes
- Blockers: 
- Decisions made:
- Lessons learned:
EOF
```

### Step 3: Read QUICK_START.md
```bash
open /Users/charlieknight/Projects/LoopIn/docs/deploy/QUICK_START.md
```

### Step 4: On Day 1, start DEPLOYMENT_PLAN.md Day 1 section

---

**Good luck! You've got all the documentation you need. Let's ship this! 🚀**

Last updated: 2026-06-27
