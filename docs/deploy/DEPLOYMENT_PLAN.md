# LoopIn Deployment Plan
**Target**: TestFlight + AWS Backend  
**Timeline**: 1 Week (2026-06-27 to 2026-07-03)  
**Owner**: Charlie Knight  
**Status**: Planning Phase

---

## 1. Pre-Deployment Checklist

### Code Changes Required
- [x] Firebase Auth (Google Sign-In) configured in iOS
- [x] Backend API controllers implemented (Auth, User, City, PlaceSearch)
- [x] Email service (Resend) integrated
- [x] Push notifications (Firebase Cloud Messaging) ready
- [ ] Frontend API endpoint configuration updated (BACKEND_URL)
- [ ] iOS bundle identifier and signing configured for release
- [ ] Backend database migrations tested on AWS
- [ ] Error handling and logging verified end-to-end

### Configuration Updates
- [ ] **Backend**: Update `application.yml` for AWS RDS connection
- [ ] **Backend**: Set environment variables (GOOGLE_PLACES_API_KEY, RESEND_API_KEY, FIREBASE_CREDENTIALS_PATH)
- [ ] **Frontend**: Update `constants/api.ts` with AWS API Gateway endpoint (replaces localhost:8080)
- [ ] **Frontend**: Verify Firebase project ID matches iOS GoogleService-Info.plist
- [ ] **iOS**: Update marketing version & build number for TestFlight
- [ ] **iOS**: Configure code signing with Apple Developer team account

### Firebase & Security Rules
- [x] Firebase Authentication enabled (Google provider)
- [ ] Firestore security rules configured (allow authenticated reads/writes)
- [ ] Firebase Cloud Messaging topic "weekly-gather" configured
- [ ] Custom claims setup for admin users (Firebase Console > Authentication > Users)
- [ ] CORS configuration for AWS API Gateway (if needed)

### Infrastructure Prerequisites
- [ ] AWS account with IAM permissions (Lambda, API Gateway, RDS, Secrets Manager)
- [ ] RDS PostgreSQL instance or equivalent database service
- [ ] AWS Secrets Manager for sensitive values (API keys, database credentials)
- [ ] CloudWatch logging enabled for Lambda/API Gateway
- [ ] SSL/TLS certificate provisioned (or use AWS Certificate Manager)

---

## 2. Deployment Phases (Day-by-Day)

### Day 1 (Friday 2026-06-27): AWS Infrastructure Setup
**Goal**: Infrastructure foundation ready, backend deployable

**Tasks:**
1. **AWS Infrastructure**
   - Create RDS PostgreSQL instance (or MySQL compatible alternative)
   - Record: DB endpoint, port (usually 5432), master username
   - Create Secrets Manager entries:
     - `LoopIn/db/password` (RDS master password)
     - `LoopIn/api/google-places-key` (GOOGLE_PLACES_API_KEY)
     - `LoopIn/api/resend-key` (RESEND_API_KEY)
     - `LoopIn/firebase/credentials` (Firebase service account JSON)
   - Security groups: Allow inbound 5432 from Lambda VPC/outbound HTTPS

2. **Prepare Backend**
   - Clone gather-service repo locally (if not already)
   - Review Prisma schema or SQL migrations (check if using Prisma or raw SQL)
   - Prepare Docker image or JAR build for deployment
   - Test locally against AWS RDS (optional but recommended)

3. **API Gateway & Lambda Planning**
   - Design Lambda function for Spring Boot app (consider: Spring Boot on Lambda limitations)
   - Alternative: EC2 + Auto Scaling Group (simpler for Spring Boot initially)
   - Create API Gateway REST API structure mirroring current `/api/*` routes
   - Plan custom domain if desired (optional for MVP)

**Deliverables:**
- RDS instance running, accessible, credentials stored in Secrets Manager
- API Gateway created with resource paths

---

### Day 2 (Saturday 2026-06-28): Backend Deployment & Database

**Goal**: gather-service running on AWS, database migrations complete

**Tasks:**
1. **Database Setup**
   - Run Prisma migrations (`npx prisma migrate deploy`) or SQL schema setup against RDS
   - Verify tables created (User, City, Place, etc.)
   - Create initial seed data if required (cities, starter data)

2. **Build & Deploy gather-service**
   - Build JAR: `./gradlew build`
   - Option A (Lambda): Package as ZIP with custom runtime
   - Option B (EC2): Deploy JAR to EC2 instance, configure systemd service
   - Configure environment variables from Secrets Manager
   - Test health check endpoint: `GET /health` (or similar)

3. **API Gateway Integration**
   - Create Lambda authorizer for Firebase ID tokens (OR disable auth for testing)
   - Wire up routes:
     - POST `/api/auth/register`
     - POST `/api/auth/login`
     - PUT `/api/users/location`
     - POST `/api/users/ensure-profile`
     - GET `/api/cities`
     - POST `/api/admin/jobs/weekly-gather` (admin only)
   - Enable CORS if needed
   - Set CloudWatch logging

4. **Testing**
   - Curl test: `curl https://<api-gateway-url>/api/cities`
   - Verify auth flow returns proper errors
   - Check CloudWatch logs for errors

**Deliverables:**
- gather-service running on AWS (Lambda or EC2)
- Database initialized
- API Gateway routes responding (auth may fail, that's OK)
- CloudWatch logs visible

---

### Day 3 (Sunday 2026-06-29): Backend Testing & Refinement

**Goal**: Backend fully tested, ready for frontend integration

**Tasks:**
1. **API Verification**
   - Test all endpoints manually (Postman/curl):
     - `/api/auth/register` with test credentials
     - `/api/auth/login` with valid token
     - `/api/users/location` (requires auth)
     - `/api/cities` (should return cities)
   - Verify error responses (400, 401, 409 for duplicate email, etc.)
   - Check database for created records (users, locations)

2. **Firebase Integration Verification**
   - Confirm Firebase service account JSON is loaded
   - Test custom token generation in `/api/auth/register`
   - Verify Firebase Admin SDK can create users

3. **Logging & Monitoring**
   - Review CloudWatch logs for startup errors
   - Set up basic alarms (Lambda errors, RDS CPU)
   - Document API endpoint URL: `https://api.loopin.dev` (or API Gateway URL)

4. **Configuration Hardening**
   - Ensure no secrets in logs
   - Enable API Gateway WAF (optional for MVP)
   - Verify CORS headers (if applicable)

**Deliverables:**
- All API endpoints tested and working
- Final API endpoint URL documented
- No errors in logs

---

### Day 4 (Monday 2026-06-30): iOS Frontend Integration & Build

**Goal**: iOS app builds with production backend, ready for TestFlight

**Tasks:**
1. **Update Frontend Configuration**
   - Edit `constants/api.ts`:
     ```typescript
     export const BACKEND_URL = 'https://api.loopin.dev'; // Update with AWS API Gateway URL
     ```
   - Rebuild and test iOS app locally with staging/production backend

2. **iOS Build Preparation**
   - Open `ios/LoopIn.xcworkspace` in Xcode
   - Select "LoopIn" target
   - Update version number in Xcode:
     - Marketing Version (CFBundleShortVersionString): `1.0.0`
     - Build Number (CFBundleVersion): `1`
   - Configure code signing:
     - Team ID: Select Apple Developer team
     - Provisioning profile: Automatic or manual
     - Signing certificate: Apple Development

3. **Build for TestFlight**
   - Clean build folder: `Cmd+Shift+K`
   - Build for archiving: Product > Archive
   - Or: `xcodebuild -workspace ios/LoopIn.xcworkspace -scheme LoopIn -configuration Release -archivePath ~/Desktop/LoopIn.xcarchive`
   - Resolve any build errors (Pods, Firebase, dependencies)

4. **Verify Functionality Locally**
   - Run on physical device or simulator
   - Test Google Sign-In flow
   - Test location selection
   - Verify network calls to AWS backend succeed

**Deliverables:**
- iOS app builds without errors
- App runs and connects to AWS backend
- API calls visible in Xcode Console
- .xcarchive file ready for TestFlight

---

### Day 5 (Tuesday 2026-07-01): TestFlight Submission & Monitoring

**Goal**: iOS app in TestFlight, initial users onboarded

**Tasks:**
1. **TestFlight Upload**
   - In Xcode: Window > Organizer > Archives > Select build > Distribute App
   - Select "TestFlight" as distribution method
   - Upload build (typically 5-15 min, automatic code signing)
   - Apple may process & review (usually < 1 hour, sometimes overnight)

2. **Create TestFlight Groups**
   - In App Store Connect > TestFlight:
     - Create "Internal Testers" group with your account
     - Add 1-2 external testers (friends, team members) if desired
     - Send invitations

3. **Testing Protocol**
   - Install app from TestFlight link on iOS device
   - Verify:
     - App launches without crashes
     - Google Sign-In works
     - Location selection works
     - Sign-out works
     - Retry after 5 min: Make sure backend is still up
   - Check CloudWatch for any errors
   - Monitor: Crashes & Hangs report in TestFlight

4. **Monitoring & Observability**
   - Set CloudWatch alarms:
     - Lambda invocation errors (> 0 in 5 min)
     - RDS CPU (> 80%)
     - API Gateway 5XX errors (> 5 per min)
   - Set up Slack/email alerts if available
   - Daily check of logs

**Deliverables:**
- iOS build in TestFlight (version 1.0.0)
- Testers invited
- First sign-ups confirmed working
- Monitoring active

---

### Days 6-7 (Wed-Thu 2026-07-02 to 2026-07-03): Iteration & Stabilization

**Goal**: Fix issues, iterate on feedback

**Tasks:**
1. **Issue Triage**
   - Review TestFlight crash reports
   - Check CloudWatch logs for backend errors
   - Prioritize: crashes > auth issues > UI polish

2. **Quick Fixes**
   - For minor issues: Create commit, rebuild, re-upload to TestFlight
   - Build number increments automatically or manually (e.g., `1` → `2`)
   - New build available in TestFlight within 1-2 hours usually

3. **Performance Review**
   - Check API response times in CloudWatch
   - Database query performance (RDS logs)
   - Any Lambda timeout issues?

4. **Documentation**
   - Update README with TestFlight instructions
   - Document backend API for future integration
   - Note any known issues for next phase

**Deliverables:**
- Stable build in TestFlight
- Issues logged, tracked
- Deployment runbook documented

---

## 3. Key Milestones

| Milestone | Target Date | Acceptance Criteria |
|-----------|-------------|-------------------|
| **AWS Infrastructure Ready** | 2026-06-27 EOD | RDS running, API Gateway created, Secrets Manager populated |
| **Backend Deployed & Tested** | 2026-06-29 EOD | All API endpoints return 200/appropriate error codes, no logs errors |
| **iOS Build Ready** | 2026-06-30 EOD | App builds successfully, connects to AWS backend |
| **TestFlight Build Live** | 2026-07-01 EOD | Build available in TestFlight, testers can install |
| **First User Sign-Up** | 2026-07-01 EOD | User successfully signs up via Google, profile created in backend |
| **Stable Beta** | 2026-07-03 EOD | No critical crashes, all core flows (auth, location, sign-out) working |

---

## 4. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **RDS Connectivity Issues** | Medium | High | Test RDS connection from Lambda/EC2 before proceeding; use security group tests; keep troubleshooting logs |
| **Firebase Custom Claims Not Applied** | Medium | Medium | Pre-configure custom claims in Firebase Console for admin users; test manually with `/api/admin/jobs/weekly-gather` |
| **Apple Code Signing Failures** | Medium | High | Pre-configure signing certificate & provisioning profile in Xcode; test on physical device first; allow 1 day buffer |
| **TestFlight Delayed Review** | Low | Medium | Submit build early; keep track of review times; Apple typically < 1 hour but sometimes overnight |
| **API Gateway CORS Blocking** | Low | High | Pre-test CORS headers from browser/iOS; enable CloudWatch logging for OPTIONS requests |
| **Prisma Migrations Fail on AWS** | Medium | High | Test migrations locally against RDS first; keep rollback migration script ready; export schema to verify |
| **Spring Boot Cold Start Timeout (Lambda)** | Medium | High | Consider EC2 instead of Lambda; or use Lambda Provisioned Concurrency; set 30s+ timeout |
| **Secrets Manager Access Denied** | Low | High | Verify IAM role has `secretsmanager:GetSecretValue` permission; test Lambda permissions before deployment |
| **Google Places API Rate Limit** | Low | Medium | Current quota should handle MVP; monitor in CloudWatch; scale API key if needed |
| **TestFlight Crash on Real Device** | Medium | High | Test on physical device before submission; capture crash logs; debug in Xcode Console |

**Top 3 Risks to Monitor:**
1. **Apple Code Signing** — Most common blocker. Prep certificates & provisioning profiles on Day 1.
2. **Database Connectivity** — Test RDS from Lambda/EC2 before deploying backend.
3. **TestFlight Review Time** — Submit early Day 5; some reviews take overnight.

---

## 5. Rollback Plan

### If Backend Breaks After Deployment

**Immediate (0-5 min):**
1. Check CloudWatch logs for the error
2. If simple config issue (e.g., env var typo): Fix & redeploy
3. If database issue: Check RDS logs; confirm credentials in Secrets Manager

**Short-term (5-30 min):**
1. If Lambda/Java startup fails:
   - Check heap size, timeout settings
   - Roll back to previous JAR version
   - Deploy pre-tested JAR from git tag

2. If database migration failed:
   - Connect to RDS directly via SQL client
   - Run `SELECT * FROM schema_migrations` to see what failed
   - Roll back migration: `npx prisma migrate resolve --rolled-back <migration-id>`
   - Reapply after fix

3. If API Gateway routes broken:
   - Temporarily delete API Gateway stack
   - Redeploy from CloudFormation/Terraform backup

**Medium-term (30 min - 2 hours):**
- If unstable, route traffic to fallback server (secondary Lambda or EC2)
- Post incident on Slack/log
- Document root cause

### If iOS Build Fails

**Immediate:**
1. Check Xcode build log for error
2. Common fixes:
   - `pod install --repo-update` (dependency issue)
   - Clean build folder: `Cmd+Shift+K`
   - Delete DerivedData: `rm -rf ~/Library/Developer/Xcode/DerivedData/*`

3. If code signing fails:
   - Re-check team ID, certificate, provisioning profile
   - Reset in Xcode: Preferences > Accounts > Download profiles

**Fallback:**
- If TestFlight upload fails, manually upload .ipa via Apple Transporter (rare)

### If TestFlight Build Crashes

**Immediate:**
1. Pull crash logs from TestFlight Console
2. Identify line in code using Xcode Organizer > Crashes & Hangs
3. Fix issue locally, increment build number, re-upload

**Escalation:**
- If unresolvable: Keep TestFlight build paused; wait for fix; retry same build number once fixed

---

## 6. Success Criteria

### Definition of "Deployment Done"
✅ **Deployment is successful when:**

1. **Backend**
   - gather-service running on AWS (Lambda or EC2)
   - All API endpoints responding to requests
   - Database (RDS) seeded and verified
   - CloudWatch logs show normal operation (no errors)
   - Uptime > 99.5% over first 24 hours (allow transient issues)

2. **Frontend (iOS)**
   - App available in TestFlight
   - App launches without crashing
   - Google Sign-In flow completes successfully
   - User profile created in backend (verified in database)
   - Location selection screen loads cities from API
   - Sign-out removes session

3. **Integration**
   - iOS app successfully makes API calls to AWS backend
   - Network requests have correct headers (Authorization, Content-Type)
   - Error responses handled gracefully (no crash on 401, 409, etc.)
   - No sensitive data logged or exposed

4. **Monitoring**
   - CloudWatch logs accessible and reviewed
   - Alarms configured for critical paths
   - Incident response documented

### Definition of "Broken" (Escalate)
🔴 **Escalate immediately if:**
- Backend unreachable for > 30 seconds
- iOS app crashes on launch (not just minor edge cases)
- User cannot sign up / auth flow broken
- RDS unavailable
- Unhandled errors in CloudWatch logs

---

## 7. Post-Deployment Checklist

**After successful deployment:**

- [ ] Update GitHub README with TestFlight installation link
- [ ] Document API endpoint URL in `DEPLOYMENT_NOTES.md` or shared wiki
- [ ] Archive build artifacts (JAR, .xcarchive) in S3 or backup
- [ ] Create GitHub release tag: `v1.0.0-beta`
- [ ] Schedule Day 7 retrospective: What went well? What to improve?
- [ ] Plan Phase 2: Additional features, Android deployment, scaling
- [ ] Notify stakeholders: Product is live in TestFlight

---

## 8. Troubleshooting Reference

### Backend Issues
| Problem | Solution |
|---------|----------|
| Lambda timeout | Increase timeout to 30s, or switch to EC2 |
| RDS connection refused | Check security group, verify endpoint, test locally first |
| Firebase credentials not found | Verify FIREBASE_CREDENTIALS_PATH in env, check Secrets Manager |
| 401 Unauthorized on protected routes | Verify Authorization header format, check Firebase Admin SDK setup |
| 409 Conflict on user registration | Check database for duplicate email, review error message |

### iOS Issues
| Problem | Solution |
|---------|----------|
| "Code signing required" error | Update team ID, delete DerivedData, retry |
| Pod dependency conflicts | `pod install --repo-update`, then clean build |
| App crashes on startup | Check Xcode Console, verify GoogleService-Info.plist, check Firebase config |
| API calls timeout | Verify BACKEND_URL is reachable, check CloudWatch for 503 errors |
| TestFlight build stuck "Processing" | Wait up to 24 hours; if still stuck, restart upload |

### Database Issues
| Problem | Solution |
|---------|----------|
| Prisma migration error | `npx prisma migrate resolve --rolled-back`, fix schema, retry |
| RDS low disk space | Scale RDS instance storage, review logs for large queries |
| Connection pool exhausted | Increase `max_connections` in RDS parameter group, restart app |

---

## 9. Communication Plan

**Daily Standup (during deployment week):**
- Update status in shared document
- Log any blockers
- Next day's focus

**If Escalation Needed:**
- Slack: `@channel` in appropriate channel
- Document in GitHub issue with label `deployment-incident`
- Root cause analysis post-incident

---

## 10. Timeline Summary

```
Fri 6/27  │ AWS Setup (RDS, API Gateway, Secrets)
Sat 6/28  │ Backend Deploy & DB Init
Sun 6/29  │ Backend Testing & Hardening
Mon 6/30  │ iOS Build & Integration
Tue 7/01  │ TestFlight Submission & First Users
Wed 7/02  │ Iteration & Fixes (v1.0.0.1, v1.0.0.2)
Thu 7/03  │ Stabilization & Documentation
```

**Go/No-Go Gates:**
- **Day 2 (Sat)**: Backend must be deployable. If blocked, escalate.
- **Day 3 (Sun)**: All API endpoints must be working. If not, debug before proceeding.
- **Day 4 (Mon)**: iOS build must complete successfully. If signing fails, resolve by EOD.
- **Day 5 (Tue)**: TestFlight must accept build. If rejected, resubmit with fixes.

---

## 11. Next Phase (After MVP)

Once TestFlight is stable, consider:
- [ ] Android deployment (parallel or after iOS stable)
- [ ] User feedback loop (surveys, analytics)
- [ ] Public beta release (if feedback positive)
- [ ] Performance optimization (API latency, database indexing)
- [ ] Auto-scaling (Lambda concurrency, RDS read replicas)
- [ ] CI/CD pipeline (automated builds, deploys)

---

**Last Updated:** 2026-06-27  
**Next Review:** 2026-07-04  
**Owner:** Charlie Knight  
**Stakeholders:** Product team, QA, Apple Developer Account holder
