# Resend Email Integration Guide

## Overview

Resend is an email service designed for developers, offering transactional and marketing email capabilities. This document explains how to integrate Resend with your Supabase-based membership system.

## Cost Implications

### Resend Pricing (2025)

| Plan | Monthly Emails | Cost/Month | Cost per 1K Emails |
|------|----------------|------------|-------------------|
| **Free** | 3,000 | $0 | $0 |
| **Pro** | 50,000 | $20 | $0.40 |
| **Scale** | 100,000 | $90 | $0.90 |
| **Scale** | 1,000,000 | $650 | $0.65 |

**Key Points:**
- Free tier includes 3,000 emails/month (100 emails/day limit)
- Perfect for small organizations and testing
- No overage fees listed - contact Resend if you exceed limits
- Volume discounts apply as you scale up
- Includes webhooks, APIs, SMTP, and analytics

### Comparison with Supabase Default SMTP

- **Supabase SMTP**: Uses third-party SMTP provider (varies by plan)
- **Resend Benefits**: 
  - Better deliverability and analytics
  - Dedicated IPs available (Scale plan, $30/month extra)
  - React Email template support
  - Webhook support for tracking opens, clicks, bounces
  - Professional email infrastructure

## Integration Methods

### Method 1: SMTP Configuration (Simplest - Recommended for Auth Emails)

Replace Supabase's default SMTP with Resend for all authentication emails (signup, password reset, magic links).

**Steps:**

1. **Get Resend SMTP Credentials**
   - Sign up at https://resend.com
   - Verify your domain (add DNS records)
   - Create an API Key
   - Get SMTP credentials:
     - Host: `smtp.resend.com`
     - Port: `465` (SMTPS) or `587` (STARTTLS)
     - Username: `resend`
     - Password: Your API key

2. **Configure Supabase**
   - Go to Supabase Project → Authentication → Settings
   - Enable Custom SMTP
   - Fill in:
     - Sender email: `noreply@yourdomain.com`
     - Sender name: Your organization name
     - Host: `smtp.resend.com`
     - Port: `465` or `587`
     - Username: `resend`
     - Password: Your Resend API key
   - Save

**Pros:** Zero code changes, works immediately  
**Cons:** Limited template customization

### Method 2: Resend API Integration (Recommended for Custom Emails)

Use Resend's REST API for custom transactional emails (membership confirmations, renewal reminders, event notifications).

**Setup:**

1. **Install Resend SDK (Optional)**
   ```bash
   npm install resend
   ```

2. **Use Replit's Resend Connector**
   - Search for "Resend" in integrations
   - Connect your Resend account
   - API key will be managed automatically

3. **Update Email Workflow Code**

   Currently, your email workflows are triggered in `SignupFormEnhanced.tsx` but don't actually send emails. To integrate Resend:

   a. Create an API route or Edge Function to send emails:
   ```typescript
   // src/api/send-email.ts (example)
   import { Resend } from 'resend';

   const resend = new Resend(process.env.RESEND_API_KEY);

   export async function sendEmail({
     to,
     subject,
     html
   }: {
     to: string;
     subject: string;
     html: string;
   }) {
     const { data, error } = await resend.emails.send({
       from: 'notifications@yourdomain.com',
       to,
       subject,
       html
     });

     if (error) {
       console.error('Resend error:', error);
       throw new Error(`Failed to send email: ${error.message}`);
     }

     return data;
   }
   ```

   b. Call this function from your email workflows in `SignupFormEnhanced.tsx` (lines 184-228)

**Pros:** Full control, custom templates, better tracking  
**Cons:** Requires code changes

### Method 3: Supabase Edge Functions with Resend (Advanced)

For complete control over email delivery with custom templates.

**When to Use:**
- Custom-designed auth emails
- React Email templates
- Multi-language support
- Advanced email workflows

See Supabase documentation for Edge Functions setup:
https://supabase.com/docs/guides/functions/examples/send-emails

## Email Template Variables

Your current system supports these variables in email templates:

### Available Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{first_name}}` | Member's first name | John |
| `{{last_name}}` | Member's last name | Smith |
| `{{email}}` | Member's email address | john@example.com |
| `{{membership_type}}` | Membership type name | Adult, Associate, Dog |
| `{{expiry_date}}` | Membership expiry date | 2025-12-31 |
| `{{organization_name}}` | Organization name | FRPS |
| `{{event_title}}` | Event name (for event emails) | Annual General Meeting |
| `{{event_date}}` | Event date (for event emails) | 2025-10-15 |

### Usage Example

**Email Subject:**
```
Welcome to {{organization_name}}, {{first_name}}!
```

**Email Body:**
```
Dear {{first_name}} {{last_name}},

Thank you for joining {{organization_name}} as a {{membership_type}} member.

Your membership is valid until {{expiry_date}}.

Best regards,
The {{organization_name}} Team
```

### Adding More Variables

To add additional variables to email templates:

1. **Update the variable list** in `EmailWorkflowsManager.tsx` (line 369)
2. **Update the placeholder text** (line 378)
3. **Update the substitution logic** in `SignupFormEnhanced.tsx` (lines 211-225)

**Example - Adding Payment Amount:**
```typescript
// In SignupFormEnhanced.tsx, add to the variables object:
const variables = {
  first_name: firstName,
  last_name: lastName,
  email: email,
  membership_type: membershipTypeNames,
  organization_name: 'Your Org Name',
  amount_paid: totalAmount.toString()  // NEW
};
```

## Database Schema for Email Variables

Your system has access to these database tables for email personalization:

### profiles Table
- `first_name`, `last_name`, `email`
- `phone`, `address`
- `role`, `is_active`

### memberships Table
- `membership_type`, `membership_year`
- `start_date`, `end_date`, `status`
- `amount_paid`, `payment_date`, `payment_reference`, `payment_type`

### organizations Table
- `name`, `slug`, `domain`
- `settings` (JSONB with custom fields)

You can extend the variable substitution to use any of these fields.

## Recommendations

1. **For Small Organizations (< 3,000 emails/month)**
   - Use Resend free tier via SMTP
   - Zero cost, good deliverability

2. **For Growing Organizations (3,000 - 50,000 emails/month)**
   - Upgrade to Resend Pro ($20/month)
   - Better analytics and support
   - Consider API integration for custom workflows

3. **For Large Organizations (50,000+ emails/month)**
   - Resend Scale plan
   - Dedicated IP ($30/month extra)
   - API integration with custom templates
   - Advanced tracking and analytics

## Next Steps

1. ✅ Create Supabase Storage bucket for documents (see `src/lib/storage/init-bucket.ts`)
2. ⬜ Set up Resend account and verify domain
3. ⬜ Choose integration method (SMTP for quick start, API for custom emails)
4. ⬜ Configure Resend credentials in Supabase or use Replit connector
5. ⬜ Test email delivery with a signup workflow
6. ⬜ Monitor usage and upgrade plan as needed

## Support Resources

- Resend Documentation: https://resend.com/docs
- Supabase + Resend: https://resend.com/docs/send-with-supabase-smtp
- Replit Resend Connector: Use `search_integrations` tool
