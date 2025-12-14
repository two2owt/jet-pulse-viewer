# JET Launch Checklist

## 🎄 Pre-Launch: Christmas Eve Week (Dec 21-24, 2025)

### Technical Infrastructure

#### Backend & Database
- [ ] **Database Performance**
  - [ ] Verify RLS policies are optimized (no N+1 queries)
  - [ ] Check indexes on frequently queried columns (user_id, deal_id, created_at)
  - [ ] Test database response times under load
  - [ ] Verify connection pooling settings

- [ ] **Edge Functions**
  - [ ] All edge functions deployed and responding
  - [ ] Error handling in place for all functions
  - [ ] Rate limiting active on location endpoints
  - [ ] JWT verification working on protected endpoints

- [ ] **Secrets & Environment**
  - [ ] VAPID keys configured (web push)
  - [ ] FCM_SERVER_KEY configured (Android push)
  - [ ] RESEND_API_KEY configured (emails)
  - [ ] STRIPE_SECRET_KEY configured (payments)
  - [ ] MAPBOX_PUBLIC_TOKEN configured (maps)
  - [ ] GOOGLE_PLACES_API_KEY configured (venue data)
  - [ ] All secrets have production values (not test keys)

#### Frontend & PWA
- [ ] **PWA Configuration**
  - [ ] Manifest.json properly configured
  - [ ] Service worker caching strategies working
  - [ ] Offline fallback page functional
  - [ ] PWA install prompt showing on mobile
  - [ ] PWA update notification working
  - [ ] Icons (192x192, 512x512) in place

- [ ] **Performance**
  - [ ] Lighthouse score > 90 (Performance)
  - [ ] Lighthouse score > 90 (Accessibility)
  - [ ] First Contentful Paint < 1.5s
  - [ ] Largest Contentful Paint < 2.5s
  - [ ] Code splitting working (lazy loaded routes)
  - [ ] Images optimized and lazy loaded

---

### Device & Browser Testing

#### Mobile Testing Matrix
| Device | Browser | Status | Tester | Notes |
|--------|---------|--------|--------|-------|
| iPhone 15 Pro | Safari | [ ] | | |
| iPhone 13 | Safari | [ ] | | |
| iPhone SE | Safari | [ ] | | |
| Samsung S23 | Chrome | [ ] | | |
| Samsung A54 | Chrome | [ ] | | |
| Google Pixel 7 | Chrome | [ ] | | |

#### Critical Mobile Checks
- [ ] **Layout & Navigation**
  - [ ] Header visible and not cut off
  - [ ] Bottom navigation visible above Safari toolbar
  - [ ] Safe area insets working on notched devices
  - [ ] No horizontal scroll on any page
  - [ ] Touch targets minimum 44x44px

- [ ] **Map Functionality**
  - [ ] Map loads and renders correctly
  - [ ] User location marker displays
  - [ ] Venue markers visible and tappable
  - [ ] Heat layer renders properly
  - [ ] City selector dropdown works
  - [ ] Map controls accessible

- [ ] **Core User Flows**
  - [ ] Sign up flow completes successfully
  - [ ] Email verification emails delivered
  - [ ] Onboarding steps work correctly
  - [ ] Deal discovery and filtering works
  - [ ] Favorites can be added/removed
  - [ ] Push notification permission flow works

#### Desktop Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

### Feature Verification

#### Authentication
- [ ] Email/password signup works
- [ ] Google OAuth works
- [ ] Email verification emails arrive (not spam)
- [ ] Password reset flow works
- [ ] Session persistence across page refreshes
- [ ] Sign out clears session properly
- [ ] Age verification (18+) enforced

#### User Profile
- [ ] Profile creation during onboarding
- [ ] Display name uniqueness enforced
- [ ] Avatar upload working
- [ ] Privacy settings functional
- [ ] Profile editing works
- [ ] Account deletion works

#### Deals & Discovery
- [ ] Active deals display correctly
- [ ] Deal filtering by preferences works
- [ ] Deal sharing generates working links
- [ ] Deep links to deals work
- [ ] Expired deals handled gracefully
- [ ] Location-based filtering accurate

#### Social Features
- [ ] Friend requests can be sent
- [ ] Friend request notifications work
- [ ] Friend acceptance flow works
- [ ] Friend email notifications delivered
- [ ] Privacy settings respected
- [ ] Connection rate limiting active

#### Notifications
- [ ] Web push subscription works (Chrome, Firefox, Edge)
- [ ] Push notification prompt appears
- [ ] Geofence notifications trigger
- [ ] Notification deep links work
- [ ] Notification settings toggle works

#### Map & Heatmap
- [ ] Map centers on user location
- [ ] Venue markers display with activity colors
  - [ ] Red = Hot (80%+)
  - [ ] Yellow = Warm (60-79%)
  - [ ] Blue = Cool (<60%)
- [ ] Heat layer shows density data
- [ ] Movement paths display correctly
- [ ] Time-lapse controls work
- [ ] Legend displays correctly

---

### Email Deliverability

#### Resend Configuration
- [ ] Custom domain configured in Resend
- [ ] DNS records verified (SPF, DKIM, DMARC)
- [ ] Test emails arriving in inbox (not spam)
- [ ] Sender address is production domain

#### Email Templates Tested
- [ ] Verification email
- [ ] Friend request notification
- [ ] Friend accepted notification
- [ ] Password reset (if applicable)

---

### Security Checklist

#### Data Protection
- [ ] All sensitive tables have RLS enabled
- [ ] RLS policies tested with different user roles
- [ ] Admin-only endpoints require admin role
- [ ] Location data retention policy active (30 days)
- [ ] Location obfuscation working (7-30 day data)
- [ ] Rate limiting on location endpoints active
- [ ] Security audit logging functional

#### Privacy Compliance
- [ ] Privacy policy accessible and accurate
- [ ] Terms of service accessible and accurate
- [ ] Consent checkboxes on signup
- [ ] Data deletion flow works (GDPR)
- [ ] Privacy settings control field visibility

---

### Analytics & Monitoring

- [ ] Analytics dashboard functional
- [ ] Live event feed showing real-time data
- [ ] User signup tracking working
- [ ] Deal engagement tracking working
- [ ] Error monitoring (Sentry) configured
- [ ] Alert thresholds set for critical metrics

---

### Content & Marketing Prep

#### App Content
- [ ] All placeholder text replaced
- [ ] Charlotte venues/deals populated
- [ ] Venue images loading correctly
- [ ] No broken links or images

#### Marketing Assets
- [ ] App Store screenshots (if applicable)
- [ ] Social media graphics prepared
- [ ] Launch announcement email drafted
- [ ] Beta tester invite list compiled

---

## 🎆 Full Launch: New Year's Eve (Dec 31, 2025)

### Go-Live Verification

#### Pre-Launch (Dec 31 Morning)
- [ ] All pre-launch checklist items complete
- [ ] Final production build deployed
- [ ] Database backup completed
- [ ] Team communication channel ready
- [ ] Incident response plan documented

#### Launch Activation
- [ ] Monetization toggle enabled (if launching subscriptions)
- [ ] Launch email campaign sent
- [ ] Social media announcements posted
- [ ] Beta testers notified of public launch

#### Post-Launch Monitoring (First 24 Hours)
- [ ] Monitor error rates in Sentry
- [ ] Check database performance metrics
- [ ] Monitor edge function response times
- [ ] Track user signups and engagement
- [ ] Respond to user feedback quickly
- [ ] Document any issues for immediate fix

---

### Incident Response Plan

#### Critical Issues (P0)
**Definition:** App completely unusable, data loss, security breach
**Response Time:** Immediate (< 15 minutes)
**Actions:**
1. Acknowledge in team channel
2. Assess impact and root cause
3. Implement hotfix or rollback
4. Communicate to affected users

#### Major Issues (P1)
**Definition:** Core feature broken, significant UX degradation
**Response Time:** < 1 hour
**Actions:**
1. Document issue with reproduction steps
2. Assign to appropriate team member
3. Implement fix within 4 hours
4. Deploy and verify

#### Minor Issues (P2)
**Definition:** Non-critical bug, cosmetic issue
**Response Time:** < 24 hours
**Actions:**
1. Log in issue tracker
2. Schedule for next sprint
3. Communicate timeline to reporter

---

### Team Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Project Lead | | | |
| Backend Dev | | | |
| Frontend Dev | | | |
| QA | | | |
| Support | | | |

---

### Rollback Plan

If critical issues occur post-launch:

1. **Frontend Rollback**
   - Revert to previous git commit
   - Redeploy via Lovable publish

2. **Database Rollback**
   - Point-in-time recovery available
   - Restore from last backup

3. **Edge Functions**
   - Redeploy previous function versions
   - Disable problematic functions if needed

---

### Success Metrics (Week 1 Targets)

| Metric | Target | Actual |
|--------|--------|--------|
| New User Signups | 100+ | |
| Daily Active Users | 50+ | |
| Deals Viewed | 500+ | |
| Favorites Added | 100+ | |
| Push Notification Opt-in Rate | 40%+ | |
| PWA Install Rate | 20%+ | |
| App Crash Rate | < 1% | |
| Avg. Session Duration | > 3 min | |

---

## Quick Reference Commands

```bash
# Sync native apps after code changes
npx cap sync

# Build for production
npm run build

# Run iOS simulator
npx cap run ios

# Run Android emulator
npx cap run android

# Deploy edge functions
# (Automatic in Lovable)
```

---

*Last Updated: December 14, 2025*
*Version: 1.0*
