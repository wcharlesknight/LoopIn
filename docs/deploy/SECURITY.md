# LoopIn AWS Security Posture

**Status:** Testing Environment (1-20 users)  
**Scope:** iOS app (TestFlight) + Spring Boot backend (AWS Lambda) + Firebase auth + location data  
**Last Updated:** 2026-06-27

---

## 1. Threat Model (STRIDE)

### Spoofing

**Risk: Unauthorized API access**
- Attacker calls backend APIs directly without valid Firebase auth token
- Attacker spoofs user identity by forging JWT claims

**Mitigation:**
- Enforce Firebase ID token verification on every Lambda function
- Backend validates token signature before processing any request
- Short token TTL (1 hour Firebase default)

**Risk: App impersonation**
- Attacker publishes fake LoopIn to TestFlight

**Mitigation:**
- Use TestFlight's iOS app provisioning and signing
- Only authorized Apple developer accounts can upload to TestFlight
- Version tracking in app prevents downgrade attacks

---

### Tampering

**Risk: Intercepted location data in transit**
- MITM attack on app → backend communication
- Attacker modifies API requests (e.g., change user's location)

**Mitigation:**
- Enforce TLS 1.2+ for all HTTP traffic (set in AWS API Gateway)
- Certificate pinning (optional, for testing phase: not required)
- Request validation: backend sanitizes and re-authorizes all location writes

**Risk: Compromised backend code**
- Attacker modifies Lambda function code
- Attacker modifies RDS/DynamoDB records

**Mitigation:**
- Lambda function code immutability via versioning (deploy via CloudFormation)
- Enable DynamoDB point-in-time recovery (PITR)
- RDS automated backups with 7-day retention
- Restrict IAM permissions (Lambda role can only access its own resources)

---

### Repudiation

**Risk: User denies location share or data access**

**Mitigation:**
- CloudWatch Logs for all API calls (timestamp, user ID, action, resource)
- Audit trail in DynamoDB: log location shares, data modifications
- Retention: 30 days for testing phase

**Implementation:** Add interceptor in backend to log all requests:
```java
@Component
public class AuditInterceptor implements WebRequestInterceptor {
    // Log: user_id, endpoint, method, timestamp, ip_address
}
```

---

### Information Disclosure

**Risk: Location data leaked (core sensitivity)**
- Firebase Firestore misconfiguration: publicly readable collection
- RDS/DynamoDB unencrypted snapshots exposed in S3
- Logs containing PII (email, location coordinates)
- Error messages exposing internal API details

**Mitigation:**
- **Firestore rules:** Ensure only authenticated users can read their own data
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /locations/{locationId} {
        allow read: if request.auth.uid == resource.data.userId;
        allow write: if request.auth.uid == resource.data.userId;
      }
      match /users/{userId} {
        allow read: if request.auth.uid == userId;
        allow write: if request.auth.uid == userId;
      }
    }
  }
  ```
- **RDS encryption:** Enable at-rest encryption (AWS KMS)
- **DynamoDB encryption:** Enabled by default; use AWS-managed keys
- **Snapshots:** Disable automated snapshots; if needed, encrypt via KMS
- **Logs:** Redact location coordinates, only log user IDs (no emails)
- **Error handling:** Return generic error messages (e.g., "Request failed") to client; log details server-side

**Risk: Firebase credentials leaked**
- firebase-service-account.json checked into repo
- Environment variables exposed in Lambda logs

**Mitigation:**
- Never commit service account JSON files (add to .gitignore)
- Store Firebase service account in AWS Secrets Manager
- Reference via Lambda environment variable (not inline)
- Rotate credentials quarterly

**Risk: AWS API keys exposed**
- Credentials in app source code
- GitHub secrets accidentally logged

**Mitigation:**
- No AWS credentials in app (only Firebase SDK)
- Backend owns AWS SDK; app delegates to backend
- GitHub Secrets encrypted at rest; rotate quarterly

---

### Denial of Service

**Risk: App users flooded with requests (DDoS)**
- Attacker makes rapid API calls (location updates, Firebase writes)
- Lambda invocations spike; costs increase

**Mitigation:**
- API Gateway rate limiting: 100 requests/min per user (per Firebase UID)
- Lambda concurrency limit: 10 (prevents runaway cost)
- DynamoDB provisioned capacity: start at 5 RCU/WCU; monitor and scale
- CloudWatch alarms: alert on high invocation rates or errors

**Configuration (API Gateway):**
```
- Throttle settings: 100 requests/second per API key (Firebase UID)
- Burst: 200 requests
```

**Risk: Location data exfiltration (high volume)**
- Attacker exports all user locations from DynamoDB

**Mitigation:**
- DynamoDB point-in-time recovery (PITR) enabled
- IAM policy: Lambda role cannot use `scan` or `query` without user context
- Only read operations for authenticated user's own data

---

### Elevation of Privilege

**Risk: User accessing another user's data**
- User modifies API request to access user_id=another_user
- Cross-user data leak (e.g., see other users' locations)

**Mitigation:**
- **Backend validation:** Extract user ID from Firebase token; never trust client
  ```java
  @PostMapping("/api/locations")
  public void createLocation(@RequestBody LocationRequest req, 
                             @AuthenticationPrincipal FirebaseToken token) {
      String userId = token.getUid();  // From token, not request
      // Use userId for all data operations
  }
  ```
- **Firestore rules:** Enforce user isolation (see rules above)
- **DynamoDB schema:** Partition by userId (not globally queryable)

**Risk: Lambda function accessing resources outside its scope**
- Lambda role overprivileged: can read RDS backups, modify other functions

**Mitigation:**
- **IAM role:** Least-privilege policy
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource": "arn:aws:logs:region:account:log-group:/aws/lambda/gather-service*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "rds:DescribeDBInstances",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ],
        "Resource": [
          "arn:aws:rds:region:account:db:gather-db",
          "arn:aws:dynamodb:region:account:table/locations",
          "arn:aws:dynamodb:region:account:table/users"
        ]
      },
      {
        "Effect": "Allow",
        "Action": "secretsmanager:GetSecretValue",
        "Resource": "arn:aws:secretsmanager:region:account:secret:firebase/*"
      }
    ]
  }
  ```
- Deny: `iam:*`, `logs:DeleteLogGroup`, `rds:ModifyDBInstance`, Lambda code updates

---

## 2. Secrets Management

### Location & Rotation

| Secret | Stored In | Rotation | Risk |
|--------|-----------|----------|------|
| **Firebase Service Account** | AWS Secrets Manager | Quarterly | High (Firebase auth) |
| **Google Places API Key** | AWS Secrets Manager | Quarterly | Medium (free tier limited) |
| **RDS Master Password** | AWS RDS (managed) | Quarterly | High (DB access) |
| **Firebase ID Token** | In-app (client) | Auto (1h) | Low (short-lived) |
| **App API Keys** | None (don't use) | N/A | N/A |

### Implementation

**Firebase Service Account:**
1. Create secret in AWS Secrets Manager: `loopin/firebase-credentials`
2. Store JSON as string (not individual fields)
3. Lambda retrieves at startup via SDK:
   ```java
   String credentials = secretsManager.getSecretValue("loopin/firebase-credentials")
                                      .getSecretString();
   FirebaseApp.initializeApp(
       FirebaseOptions.builder()
           .setCredentials(GoogleCredentials.fromStream(
               new ByteArrayInputStream(credentials.getBytes())
           ))
           .setDatabaseUrl(...)
           .build()
   );
   ```
4. Rotate: Delete old key in Firebase Console → Create new → Update secret

**Google Places API Key:**
1. Store in Secrets Manager: `loopin/google-places-api-key`
2. Lambda references: `${GOOGLE_PLACES_API_KEY_SECRET}`
3. Rotate: Create new key in Google Cloud Console → Restrict to LoopIn IPs → Update → Disable old key after 1 week

**RDS Master Password:**
1. Use AWS-managed password (RDS automatically rotates)
   ```
   Enable: RDS → DB Instance → Modify → Manage master user password
   ```
2. If manual: Store in Secrets Manager, rotate every 90 days
3. Lambda uses IAM Database Authentication (no password in code)
   ```sql
   SELECT CURRENT_USER;  -- Should be iamdb-auth-user
   ```

**GitHub Secrets (for CI/CD only):**
- Store AWS deployment role ARN for GitHub Actions
- Use OpenID Connect (OIDC) for assume role (no long-lived keys)
- Never store Firebase credentials in GitHub

### Auditing

```bash
# Who accessed the Firebase secret?
aws secretsmanager describe-secret --secret-id loopin/firebase-credentials
aws cloudtrail lookup-events --lookup-attributes AttributeKey=ResourceName,AttributeValue=loopin/firebase-credentials
```

---

## 3. API Security

### Backend-to-Frontend (App ↔ Lambda)

**Transport Layer:**
- API Gateway enforces HTTPS (TLS 1.2+)
- Disable HTTP (return 301 redirect)
- Configure in CloudFormation: `EndpointConfiguration.Type = REGIONAL`

**Authentication:**
- Firebase ID token as `Authorization: Bearer <token>` header
- API Gateway authorizer validates token:
  ```java
  public TokenAuthorizerContext authorizeToken(Map<String, Object> input) {
      String token = input.get("authorizationToken").toString();
      FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
      return new TokenAuthorizerContext()
          .withPrincipalId(decodedToken.getUid())
          .withPolicyDocument(allowPolicy(decodedToken.getUid()));
  }
  ```
- Reject requests without valid token (return 401)

**Authorization:**
- User can only access their own resources (user ID from token)
- Location data: scoped by `userId` (read own, write own)
- Admin endpoints (if any): require custom Firebase claims

**Rate Limiting:**
- Per-user limit: 100 requests/minute (via API Gateway)
- Per-endpoint: 10 requests/second (CloudWatch)

**Input Validation:**
- Location coordinates: valid latitude (-90 to 90), longitude (-180 to 180)
- User ID: matches Firebase UID pattern (28 chars, alphanumeric)
- Strings: max 1000 chars, no SQL/NoSQL injection patterns
  ```java
  @RequestBody
  public LocationRequest {
      @NotNull @Min(-90) @Max(90) Double latitude;
      @NotNull @Min(-180) @Max(180) Double longitude;
      @Size(min=1, max=255) String name;
  }
  ```

**Error Handling:**
- Never expose stack traces or internal error details
- Log full errors; return generic messages to client:
  ```java
  try {
      // operation
  } catch (Exception e) {
      logger.error("User {} failed to update location", userId, e);  // Server-side
      throw new ApiException("Failed to save location", HttpStatus.INTERNAL_SERVER_ERROR);  // Client-side
  }
  ```

### Lambda Security

**Execution Environment:**
- Lambda runtime: Java 17 (LTS, actively maintained)
- VPC: Optional for testing (not required if using managed services)
  - If using VPC: attach NAT gateway for outbound (Google Places API, Firebase)
  - If NOT using VPC: API calls work directly (simpler for testing)
- Environment variables: Encrypted at rest (AWS-managed key)
- Timeout: 60 seconds (adequate for API calls)
- Memory: 1024 MB (balance cost vs. performance)

**IAM Role (principle of least privilege):**
- See Threat Model section above for full policy
- Deny: `*` actions at the top level
- Allow only: `logs`, `rds`, `dynamodb`, `secretsmanager` for LoopIn resources

**Code Security:**
- No secrets in code (hardcoded keys, passwords, tokens)
- Use AWS X-Ray for tracing (optional for testing)
  ```xml
  <dependency>
      <groupId>com.amazonaws</groupId>
      <artifactId>aws-xray-recorder-sdk-spring</artifactId>
      <version>2.14.2</version>
  </dependency>
  ```
- Enable Lambda function versioning (Terraform/CloudFormation)
- Code deployed via CI/CD (GitHub Actions), not manual uploads

**Cold Start Mitigation:**
- Not critical for testing; optimize later if needed
- Warm-up: CloudWatch scheduled rule invokes Lambda every 5 minutes
  ```bash
  aws events put-rule --name loopin-lambda-warmup \
    --schedule-expression "rate(5 minutes)"
  ```

### API Gateway Security

**Configuration:**
- API type: REST API (simpler than HTTP API for fine-grained auth)
- Logging: CloudWatch Logs enabled
  ```
  - Log Level: INFO
  - Log Format: $context.requestId $context.authorizer.principalId $requestTime $httpMethod $resourcePath $status
  ```
- Caching: Disabled for now (user-specific data, not cacheable)
- WAF: Optional
  - Attach AWS WAF with managed rules (SQL injection, XSS, rate limiting)
  - Cost: $7.50/month (reasonable for testing)

**Endpoints:**
- `/api/auth/register` - POST (public, but validate email format)
- `/api/auth/login` - POST (public, rate limit to 5 req/min per IP)
- `/api/locations` - GET/POST/PUT (authenticated)
- `/api/users/{userId}` - GET/PUT (authenticated, user isolation)

---

## 4. Data Protection

### Encryption at Rest

**RDS (PostgreSQL):**
- Enable KMS encryption
  ```bash
  aws rds create-db-instance \
    --db-instance-identifier gather-db \
    --kms-key-id arn:aws:kms:region:account:key/12345678-1234-1234-1234-123456789012 \
    --storage-encrypted
  ```
- Automated backups: 7-day retention, encrypted with same key
- Multi-AZ: Yes (for data redundancy, not security)

**DynamoDB:**
- Encryption enabled by default (AWS-managed keys)
- Optionally use customer-managed KMS key (adds cost, minimal benefit for testing)
- Point-in-time recovery (PITR): Enabled (restore to any point in last 35 days)

**Firebase Firestore:**
- Google Cloud manages encryption (AES-256)
- No additional configuration needed
- Backups: Enable scheduled exports to GCS (optional for testing)

### Encryption in Transit

**App → API Gateway → Lambda:**
- HTTPS/TLS 1.2+ (enforced by API Gateway)
- Certificate: AWS-managed (auto-renewed)
- Cipher suites: AWS-recommended defaults

**Lambda → RDS:**
- Option 1: RDS Proxy (managed, recommended)
  - Handles encryption, connection pooling
  - Cost: $0.015/hour (~$11/month)
- Option 2: Direct connection with SSL
  ```java
  datasource.url=jdbc:postgresql://rds-host:5432/gather?ssl=true&sslmode=require
  ```

**Lambda → DynamoDB:**
- Encrypted by default (HTTPS)

**Lambda → Firebase:**
- Google SDK uses HTTPS (built-in)

**Lambda → Google Places API:**
- HTTPS only (API requirement)

### User Data Handling

**Scope (per Firebase + LoopIn architecture):**
- User identity: Email (Firebase Auth manages)
- Location data: Latitude, longitude, timestamp (LoopIn owns, user-controlled)
- Optional: Phone number, bio, preferences (if added later)

**Data Minimization:**
- Only collect: email, location, timestamp
- Don't collect: IP address, device identifiers, browsing history
- Retention: Location data retained until user deletes; logs 30 days

**User Rights (prepare for future GDPR requests):**
- Export: Implement `/api/users/{userId}/export` → returns all user data as JSON
- Delete: Implement `/api/users/{userId}` DELETE → cascading delete (locations, logs)
- Both require Firebase token (user authentication)

**Implementation:**
```java
@DeleteMapping("/api/users/{userId}")
public void deleteUser(@PathVariable String userId, 
                       @AuthenticationPrincipal FirebaseToken token) {
    if (!token.getUid().equals(userId)) {
        throw new AccessDeniedException("Can only delete your own account");
    }
    
    userRepository.deleteById(userId);  // Cascades to locations
    auditLog.record(userId, "ACCOUNT_DELETED", Instant.now());
}
```

---

## 5. Compliance & Data Residency

### GDPR Considerations (EU Users)

**Applicability:** If testing group includes EU residents, GDPR applies even for testing.

**Key Obligations:**

1. **Lawful Basis:** User consent (explicit opt-in)
   - App: "I agree to share my location with LoopIn" checkbox
   - Capture: `consentGivenAt` timestamp in Firestore

2. **Data Subject Rights:**
   - Access: `/api/users/{userId}/export`
   - Delete: `/api/users/{userId}` DELETE endpoint
   - Portability: Export data in JSON format

3. **Data Protection Impact Assessment (DPIA):**
   - Not required for testing (small scope, low-risk processing)
   - Document later if commercializing

4. **Data Processor Agreement:**
   - AWS: Yes, AWS DPA covers RDS/DynamoDB
   - Google: Yes, Google DPA covers Firebase/Firestore
   - No 3rd-party processors currently

5. **Breach Notification:**
   - If a breach occurs: Notify affected users within 72 hours
   - Document in incident log (CloudWatch, AWS Systems Manager)

**Compliance Checklist:**
- [ ] Privacy Policy published (optional for testing, required before launch)
- [ ] Consent mechanism added to app
- [ ] Data export endpoint implemented
- [ ] Data deletion endpoint implemented
- [ ] DPA in place with AWS & Google
- [ ] Incident response plan documented

### Data Residency

**AWS Region:**
- Recommended: `us-west-2` (Oregon, closest to Seattle)
- All resources (RDS, DynamoDB, Lambda, S3) in same region
- Data never leaves region (compliance with residency laws)

**Firebase (Google):**
- Firestore: Multi-region by default (Google's discretion)
- To lock to US region: Use Firestore regional backups (optional)
  ```bash
  gcloud firestore backups create --collection-ids=locations \
    --instance=default --region=us-west1
  ```

**Configuration:**
```yaml
# Terraform
provider "aws" {
  region = "us-west-2"
}

resource "google_app_engine_application" "default" {
  location_id = "us-central"  # Google default, acceptable for testing
}
```

### Testing Environment Isolation

**Separation from Production (future):**
- AWS Account: Use separate account for testing (if possible)
  - Prevents accidental data leaks between test ↔ production
  - Not critical now (only testing environment exists)
- Database: Separate RDS instance
  - Do NOT use production DB for testing
  - Use read replicas for staging
- Firebase: Separate Firebase project
  - Prevents test data mixing with production
  - Easier to wipe between test cycles
- API Gateway: Separate API (or URL path)
  - `/test/api/locations` vs. `/api/locations`

**Cleanup:**
- Daily script: Delete location data > 30 days old
  ```java
  @Scheduled(cron = "0 0 1 * * *")  // 1 AM daily
  public void cleanupOldData() {
      LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
      locationRepository.deleteOlderThan(cutoff);
  }
  ```

---

## 6. Deployment & Monitoring

### Deployment Security

**CI/CD Pipeline (GitHub Actions):**
- Use GitHub OIDC for AWS assume-role (no long-lived keys)
  ```yaml
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::ACCOUNT:role/github-oidc-role
      aws-region: us-west-2
  ```
- Secrets: Store Firebase credentials in GitHub Secrets (encrypted)
- Approval: Require manual approval before production deployment (even for testing)
- Testing: Run unit tests + integration tests before deploying
  ```bash
  mvn test
  mvn integration-test
  ```

**Artifact Security:**
- JAR file: Sign with code-signing certificate (optional for testing)
- Scan: Use AWS CodeBuild to scan for vulnerabilities
  ```yaml
  - aws codeartifact scan-package --format maven \
      --domain loopin --repository gather-service --package gather-service
  ```

### Monitoring & Alerting

**CloudWatch Metrics:**
- Lambda invocations, errors, duration
- RDS CPU, connections, disk space
- DynamoDB consumed capacity, throttling
- API Gateway request count, 4xx/5xx errors

**CloudWatch Alarms:**
```
- Lambda errors > 5 in 5 minutes → Email alert
- RDS CPU > 80% → Email alert
- DynamoDB throttling > 0 → Immediate alert
- Unauthorized API requests (401/403) > 10/min → Log & monitor
```

**CloudTrail (Audit Log):**
- Enable for all API calls (AWS resource changes)
- Retention: 90 days
- Alerts: Config changes (IAM, RDS, Lambda)

**Application Logs:**
- Log all API calls: user ID, endpoint, method, status, timestamp
- Log all data modifications: user ID, action, resource, timestamp
- Retention: 30 days
- Redact: Email addresses (use user ID instead), exact locations (coarse-grained)

---

## 7. Incident Response

### Incident Severity

| Level | Example | Response Time |
|-------|---------|----------------|
| **Critical** | Unauthorized access to location data, Firebase credentials leaked | 1 hour |
| **High** | DDoS attack, Lambda errors > 50%, RDS down | 4 hours |
| **Medium** | API rate limit exceeded, suspicious access patterns | 1 day |
| **Low** | Log storage full, non-critical monitoring gap | 1 week |

### Response Procedure

1. **Detect:** CloudWatch alarm triggers, manual report
2. **Assess:** Severity level, affected users, data scope
3. **Contain:** Disable compromised resource (e.g., revoke API key, snapshot DB)
4. **Eradicate:** Fix root cause (patch, credential rotation, etc.)
5. **Recover:** Restore from backup, re-enable service
6. **Learn:** Post-mortem, update security controls

### Example: Firebase Credentials Leaked

1. **Detect:** GitHub repo shows credentials in logs
2. **Assess:** Critical (Auth compromise)
3. **Contain:** 
   - Delete leaked service account from Firebase Console
   - Disable old credentials in AWS Secrets Manager
4. **Eradicate:** 
   - Create new service account
   - Update Secrets Manager
   - Redeploy Lambda function
5. **Recover:** 
   - Verify new credentials work
   - Check CloudTrail for unauthorized access (likely none, credentials just created)
6. **Learn:** 
   - Add `.gitignore` rule for `firebase-*.json`
   - Add pre-commit hook to scan for secrets
   - Document in runbook

---

## 8. Quick Start Deployment Checklist

### Pre-Deployment (1-2 hours)

- [ ] Create AWS account or use existing
- [ ] Create Firebase project (or use existing)
- [ ] Create RDS instance (PostgreSQL, encrypted, multi-AZ optional)
- [ ] Create DynamoDB table (provisioned: 5 RCU/WCU)
- [ ] Create API Gateway REST API
- [ ] Create Lambda IAM role (least-privilege policy, see Section 1)
- [ ] Create Lambda function (Java runtime, 1024 MB, 60s timeout)

### Secrets (30 minutes)

- [ ] AWS Secrets Manager: Store Firebase service account JSON
- [ ] AWS Secrets Manager: Store Google Places API key
- [ ] Lambda environment variable: `FIREBASE_CREDENTIALS_SECRET=loopin/firebase-credentials`
- [ ] Lambda environment variable: `GOOGLE_PLACES_API_KEY_SECRET=loopin/google-places-api-key`

### Configuration (1 hour)

- [ ] API Gateway: Enforce HTTPS only
- [ ] API Gateway: Set rate limit (100 req/min per user)
- [ ] API Gateway: Add authorizer (Firebase token verification)
- [ ] RDS: Enable encryption at rest (KMS)
- [ ] RDS: Enable automated backups (7-day retention)
- [ ] DynamoDB: Verify encryption enabled (default)
- [ ] DynamoDB: Enable PITR
- [ ] Firebase Firestore: Deploy security rules (user isolation)
- [ ] CloudWatch: Create alarms for Lambda errors, RDS CPU, DynamoDB throttling

### Testing (2 hours)

- [ ] Deploy test user to iOS app
- [ ] Register user via `/api/auth/register`, verify Firebase token
- [ ] Post location via `/api/locations`, verify encryption & user isolation
- [ ] Verify unauthorized user cannot access another user's data
- [ ] Load test: 20 concurrent requests, verify rate limiting works
- [ ] Verify logs redact sensitive data (no exact locations, no emails)

### Post-Deployment

- [ ] Document API endpoints in Postman collection
- [ ] Create runbook: How to rotate Firebase credentials
- [ ] Create runbook: How to restore from RDS backup
- [ ] Schedule 30-day review of logs & monitoring

---

## 9. Future Hardening (Post-Testing)

**Not required for testing, but plan for:**

- [ ] AWS WAF: Attach to API Gateway (SQL injection, XSS detection)
- [ ] Certificate pinning: Lock app to specific certificate (app → API)
- [ ] Secrets Rotation: Implement automated rotation (every 90 days)
- [ ] VPC: Move Lambda & RDS into VPC for network isolation
- [ ] Load Testing: Stress test to baseline DDoS resilience
- [ ] Penetration Testing: Hire consultant to audit API & app
- [ ] GDPR: Implement data export/delete endpoints, privacy policy
- [ ] HIPAA/SOC2: If handling health data or need compliance cert
- [ ] Automated Security Scanning: CodeBuild + Snyk for dependency vulnerabilities

---

## 10. Reference Commands

### AWS CLI

```bash
# Rotate Firebase credentials
aws secretsmanager put-secret-value \
  --secret-id loopin/firebase-credentials \
  --secret-string file://new-service-account.json

# View Lambda logs
aws logs tail /aws/lambda/gather-service --follow

# Check RDS encryption
aws rds describe-db-instances --db-instance-identifier gather-db \
  --query 'DBInstances[0].StorageEncrypted'

# List DynamoDB backups
aws dynamodb list-backups --table-name locations
```

### Firebase

```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Export Firestore data
gcloud firestore export gs://loopin-backups/export-$(date +%s)

# Rotate service account key
gcloud iam service-accounts keys create new-key.json \
  --iam-account=firebase-service-account@loopin.iam.gserviceaccount.com
gcloud iam service-accounts keys delete [OLD_KEY_ID] \
  --iam-account=firebase-service-account@loopin.iam.gserviceaccount.com
```

### Testing

```bash
# Test API endpoint
curl -H "Authorization: Bearer $FIREBASE_TOKEN" \
  https://api.loopin.example.com/api/locations

# Load test (100 concurrent requests)
ab -n 1000 -c 100 \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  https://api.loopin.example.com/api/locations

# Verify HTTPS enforcement
curl -i http://api.loopin.example.com/api/locations  # Should redirect
```

---

## Contact & Escalation

- **Security Issues:** Report to wcharlesknight@gmail.com
- **AWS Support:** Use AWS console (Business support for testing)
- **Firebase Support:** Use Google Cloud Console
