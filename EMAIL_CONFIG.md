# Email Configuration

## Resend Email Service Configuration

### Current "From" Email Address
The system currently uses the following "from" address for all outgoing emails:

**Email Address:** `support@ringing.org.uk`

This email address must be from a **verified domain** in your Resend account.

---

## How to Update the Email Address

When you need to change the "from" email address in the future:

### 1. Verify the New Domain in Resend
- Log into [resend.com](https://resend.com)
- Go to **Domains** → **Add Domain**
- Add DNS records (SPF, DKIM, DMARC) to verify ownership
- Wait for verification (can take up to 48 hours)

### 2. Update the Code
Update the `from` address in **`server.js`** in these 3 locations:

#### Location 1: Member Welcome Emails (line ~452)
```javascript
from: 'support@ringing.org.uk', // Verified Resend domain
```

#### Location 2: Campaign Emails (line ~610)
```javascript
from: 'support@ringing.org.uk', // Verified Resend domain
```

#### Location 3: Email Workflow Test Emails (line ~760)
```javascript
from: 'support@ringing.org.uk', // Verified Resend domain
```

### 3. Search and Replace
Use this command to find all occurrences:
```bash
grep -r "support@ringing.org.uk" server.js
```

Then replace with your new email address.

---

## Future Improvement: Environment Variable

For easier configuration management, consider using an environment variable:

1. Add to `.env`:
   ```
   RESEND_FROM_EMAIL=support@ringing.org.uk
   ```

2. Update code to use:
   ```javascript
   from: process.env.RESEND_FROM_EMAIL || 'support@ringing.org.uk',
   ```

This allows changing the email address without modifying code.

---

## Email Types Sent by the System

| Email Type | Trigger | Location |
|------------|---------|----------|
| **Member Welcome** | Admin approves new member | `POST /api/members/:id/approve` |
| **Email Campaigns** | Admin sends campaign to mailing list | `POST /api/campaigns/send` |
| **Email Workflow Test** | Admin tests workflow before activation | `POST /api/workflows/test` |
| **Automated Workflows** | Triggered by member events (join, renewal, etc.) | Email workflows feature |

---

## Resend Account Details

- **Service:** [Resend](https://resend.com)
- **Current Verified Domain:** `ringing.org.uk`
- **API Key Location:** Environment variable `RESEND_API_KEY`
- **Current From Address:** `support@ringing.org.uk`

**Note:** Resend restricts sending to verified emails only until a domain is verified. With a verified domain, you can send to any email address.
