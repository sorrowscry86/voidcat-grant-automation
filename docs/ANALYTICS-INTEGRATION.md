# Analytics Integration Guide

## Google Analytics 4 Setup

The VoidCat RDC platform includes comprehensive analytics tracking to monitor user behavior, conversion rates, and platform performance.

### Configuration Steps

1. **Create Google Analytics 4 Property:**
   - Go to [Google Analytics](https://analytics.google.com)
   - Create a new GA4 property for "VoidCat RDC Federal Grant Automation"
   - Copy your Measurement ID (format: G-XXXXXXXXXX)

2. **Update Frontend Configuration:**
   - Edit `frontend/index.html`
   - Replace `GA_MEASUREMENT_ID` with your actual measurement ID
   - Both instances in the Google Analytics script

3. **Verify Implementation:**
   ```bash
   # Test analytics in browser console
   gtag('event', 'test_event', { test_param: 'value' });
   ```

### Tracked Events

#### Core Engagement Events
- **grant_search**: User searches for grants
  - `search_term`: Search query used
  - `results_count`: Number of results returned
  - `data_source`: live/mock data indicator

- **grant_view**: User views grant details
  - `grant_id`: Unique grant identifier
  - `agency`: Grant agency
  - `matching_score`: AI matching score

#### Conversion Events
- **sign_up**: User registration
  - `subscription_tier`: free/pro
  - `registration_method`: email/social
  
- **proposal_generation**: AI proposal created
  - `grant_id`: Target grant
  - `generation_time`: Time to generate
  - `success`: true/false

- **purchase**: Pro subscription upgrade
  - `value`: 99 (monthly fee)
  - `currency`: USD

#### User Experience Events
- **page_view**: Automatic page views
- **search_filter**: Filter usage (agency, amount, deadline)
- **modal_interaction**: Modal opens/closes
- **error_occurred**: System errors and failures

### Dashboard Metrics

#### Key Performance Indicators (KPIs)
- **Conversion Rate**: Registrations / Unique visitors
- **Upgrade Rate**: Pro signups / Free registrations  
- **Engagement Rate**: Grant searches / Sessions
- **Success Rate**: Successful proposals / Total proposals

#### User Journey Analysis
- **Acquisition**: Traffic sources and channels
- **Engagement**: Pages per session, session duration
- **Conversion**: Goal completions and funnels
- **Retention**: Returning user rate

### Custom Dimensions & Metrics

#### Recommended Custom Dimensions
1. **Subscription Tier** (User-scoped)
2. **Data Source** (Event-scoped) 
3. **Grant Agency** (Event-scoped)
4. **User Type** (Session-scoped): New/Returning

#### Custom Metrics
1. **Grant Search Depth**: Average searches per session
2. **Proposal Success Rate**: Successful generations / Attempts
3. **Time to Conversion**: Registration to first proposal

### Privacy & Compliance

#### GDPR Compliance
- Analytics tracking respects user consent
- IP anonymization enabled by default
- Data retention set to 26 months

#### User Privacy Controls
```javascript
// Disable analytics for opted-out users
if (localStorage.getItem('analytics_disabled') === 'true') {
    window['ga-disable-GA_MEASUREMENT_ID'] = true;
}
```

### Implementation Integration

#### Grant Search Tracking
```javascript
// In searchGrants() method
if (data.success && data.grants) {
    trackGrantSearch(this.searchQuery, data.grants.length);
}
```

#### Registration Tracking  
```javascript
// In register() method success
trackUserRegistration(this.user.subscription_tier);
```

#### Proposal Generation Tracking
```javascript
// In generateProposal() method success
trackProposalGeneration(grantId);
```

### Performance Monitoring

#### Core Web Vitals
- **LCP**: Largest Contentful Paint < 2.5s
- **FID**: First Input Delay < 100ms  
- **CLS**: Cumulative Layout Shift < 0.1

#### Business Metrics
- **API Response Time**: Grant search performance
- **Error Rate**: Failed requests / Total requests
- **User Satisfaction**: Time on site, bounce rate

### Advanced Analytics Features

#### Enhanced Ecommerce Tracking
```javascript
// Track Pro subscription purchase
gtag('event', 'purchase', {
    transaction_id: sessionId,
    value: 99.00,
    currency: 'USD',
    items: [{
        item_id: 'pro_subscription',
        item_name: 'VoidCat RDC Pro',
        category: 'subscription',
        quantity: 1,
        price: 99.00
    }]
});
```

#### Audience Segmentation
- **Grant Seekers**: Users who search frequently
- **Converters**: Users who generate proposals  
- **Upgraders**: Free to Pro conversions
- **Power Users**: High engagement, multiple sessions

### Reporting Dashboard

#### Automated Reports
- Daily active users and key metrics
- Weekly conversion funnel analysis
- Monthly revenue and growth tracking
- Quarterly user behavior insights

#### Alert Configuration
- Conversion rate drops > 20%
- Error rate increases > 5%
- API response time > 3 seconds
- Traffic drops > 30% day-over-day

### Next Steps

1. **Set up Google Analytics 4 property**
2. **Configure measurement ID in frontend**
3. **Test event tracking in development**
4. **Set up custom dimensions and metrics**
5. **Create conversion goals and funnels**
6. **Implement privacy controls**
7. **Configure automated reporting**

### Support Resources

- [GA4 Setup Guide](https://support.google.com/analytics/answer/9304153)
- [Event Tracking Documentation](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [Enhanced Ecommerce Guide](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)

---

**Status**: Ready for implementation  
**Priority**: High (addresses review recommendation)  
**Timeline**: 1-2 days for full setup and testing