# Email Template Fields Reference

## Overview

Your membership management system supports variable substitution in email templates and workflows. This allows you to personalize emails sent to members.

## How to Use Variables

Variables are inserted using double curly braces: `{{variable_name}}`

**Example:**
```
Subject: Welcome {{first_name}}!

Body:
Dear {{first_name}} {{last_name}},

Thank you for joining {{organization_name}} as a {{membership_type}} member.

Your membership expires on {{expiry_date}}.
```

## Available Variables

### Member Information

| Variable | Description | Example Value | Source Table |
|----------|-------------|---------------|--------------|
| `{{first_name}}` | Member's first name | John | profiles |
| `{{last_name}}` | Member's last name | Smith | profiles |
| `{{email}}` | Member's email address | john@example.com | profiles |
| `{{phone}}` | Member's phone number | +44 1234 567890 | profiles |

### Membership Details

| Variable | Description | Example Value | Source Table |
|----------|-------------|---------------|--------------|
| `{{membership_type}}` | Type of membership | Adult, Associate, Dog | memberships |
| `{{membership_year}}` | Membership year | 2025 | memberships |
| `{{start_date}}` | Membership start date | 2025-01-01 | memberships |
| `{{end_date}}` | Membership end date | 2025-12-31 | memberships |
| `{{expiry_date}}` | Same as end_date | 2025-12-31 | memberships |
| `{{status}}` | Membership status | active, expired, pending | memberships |

### Payment Information

| Variable | Description | Example Value | Source Table |
|----------|-------------|---------------|--------------|
| `{{amount_paid}}` | Amount paid | 45.00 | memberships |
| `{{payment_date}}` | Date of payment | 2025-01-15 | memberships |
| `{{payment_reference}}` | Payment reference | BACS-123456 | memberships |
| `{{payment_type}}` | Payment method | bacs, cheque, cash, card | memberships |

### Organization Details

| Variable | Description | Example Value | Source Table |
|----------|-------------|---------------|--------------|
| `{{organization_name}}` | Organization name | FRPS | organizations |
| `{{organization_slug}}` | Organization URL slug | frps | organizations |

### Event Information (Event Emails Only)

| Variable | Description | Example Value | Source Table |
|----------|-------------|---------------|--------------|
| `{{event_title}}` | Event name | Annual General Meeting | events |
| `{{event_date}}` | Event date | 2025-10-15 | events |
| `{{event_location}}` | Event location | Village Hall | events |
| `{{event_description}}` | Event description | Join us for... | events |

## Where Variables Are Used

### 1. Email Workflows

Location: **Admin Portal → Email Workflows**

Email workflows are triggered automatically when:
- A new member signs up (`signup`)
- A member renews their membership (`renewal`)
- Both signup and renewal (`both`)

Each workflow has:
- **Email Subject**: Can include variables
- **Email Template**: Full email body with variables

**Example Workflow:**
- Trigger: `signup`
- Subject: `Welcome to {{organization_name}}, {{first_name}}!`
- Template: `Dear {{first_name}} {{last_name}}, Thank you for joining as a {{membership_type}} member...`

### 2. Email Templates

Location: **Admin Portal → Email Templates**

Pre-defined templates for common scenarios:
- Welcome emails
- Renewal reminders
- Expiry warnings
- Event reminders
- Custom templates

Templates include:
- **Subject**: With variable support
- **Body (HTML)**: Rich HTML content with variables
- **Body (Text)**: Plain text fallback with variables

### 3. Admin Notifications

Email workflows can notify admins when members sign up or renew:
- Recipient Email: Admin email address
- Subject: `New member signup: {{first_name}} {{last_name}}`
- Template: `A new member has signed up with {{membership_type}} membership...`

## How Variables Are Replaced

Variables are replaced with actual data when emails are sent:

1. **At Signup**: System retrieves data from the signup form
2. **At Approval**: Admin creates membership records with specific details
3. **Email Sending**: Variables replaced with real values from database

**Example Flow:**
```
Template:    "Welcome {{first_name}}! Your {{membership_type}} expires {{expiry_date}}"
                    ↓
Database:    first_name = "Sarah", membership_type = "Adult", expiry_date = "2025-12-31"
                    ↓
Sent Email:  "Welcome Sarah! Your Adult membership expires 2025-12-31"
```

## Adding Custom Variables

To add new variables to the email system:

### Step 1: Update EmailWorkflowsManager.tsx

File: `src/components/admin/EmailWorkflowsManager.tsx`

Find line 369 and add your variable:
```typescript
Available variables: {{first_name}}, {{last_name}}, {{email}}, {{membership_type}}, {{your_new_field}}
```

### Step 2: Update Placeholder Text

Find line 378 and update the placeholder:
```typescript
placeholder="New member {{first_name}} {{last_name}} has signed up for {{membership_type}} with {{your_new_field}}."
```

### Step 3: Update Variable Substitution Logic

File: `src/components/auth/SignupFormEnhanced.tsx`

Find the variable replacement logic (around line 211-225) and add your field:
```typescript
const variables = {
  first_name: firstName,
  last_name: lastName,
  email: email,
  membership_type: membershipTypeNames,
  organization_name: 'Your Org',
  your_new_field: yourFieldValue  // NEW
};

// Replace variables in subject and template
let subject = workflow.email_subject;
let template = workflow.email_template;

for (const [key, value] of Object.entries(variables)) {
  const regex = new RegExp(`{{${key}}}`, 'g');
  subject = subject.replace(regex, value);
  template = template.replace(regex, value);
}
```

## Database Fields Available

You can add any field from these tables as variables:

### profiles Table
- `id`, `user_id`, `organization_id`
- `email`, `first_name`, `last_name`
- `phone`, `address` (JSONB: street, city, postcode, country)
- `role`, `is_active`
- `metadata` (JSONB: custom fields)

### memberships Table
- `id`, `organization_id`, `profile_id`
- `membership_year`, `membership_type`
- `start_date`, `end_date`, `status`
- `amount_paid`, `payment_date`, `payment_reference`, `payment_type`
- `benefits` (JSONB: custom benefits)
- `notes`

### organizations Table
- `id`, `name`, `slug`, `domain`
- `settings` (JSONB: contact info, colors, logo, etc.)
- `is_active`

### profile_form_responses Table (Signup Data)
- `response_data` (JSONB: all signup form fields including custom fields)
- `linkedMemberNames` (for family memberships)
- `membershipQuantities`
- `paymentInfo`

## Examples by Use Case

### New Member Welcome
```
Subject: Welcome to {{organization_name}}, {{first_name}}!

Body:
Dear {{first_name}} {{last_name}},

Thank you for joining {{organization_name}}!

Your {{membership_type}} membership is now active and will expire on {{expiry_date}}.

Payment Details:
- Amount: £{{amount_paid}}
- Reference: {{payment_reference}}
- Method: {{payment_type}}

We look forward to seeing you at our events.

Best regards,
The {{organization_name}} Team
```

### Renewal Reminder
```
Subject: Time to renew your {{membership_type}} membership

Body:
Dear {{first_name}},

Your {{membership_type}} membership expires on {{expiry_date}}.

Please renew soon to continue enjoying your benefits.

Last year you paid £{{amount_paid}} via {{payment_type}}.

Best regards,
{{organization_name}}
```

### Admin Notification
```
Subject: New signup: {{first_name}} {{last_name}} ({{membership_type}})

Body:
A new member has signed up:

Name: {{first_name}} {{last_name}}
Email: {{email}}
Phone: {{phone}}
Membership: {{membership_type}}
Amount: £{{amount_paid}}
Payment: {{payment_type}} - {{payment_reference}}

Please review and approve in the admin dashboard.
```

### Event Reminder
```
Subject: Reminder: {{event_title}} on {{event_date}}

Body:
Dear {{first_name}},

This is a reminder about our upcoming event:

Event: {{event_title}}
Date: {{event_date}}
Location: {{event_location}}

{{event_description}}

We look forward to seeing you there!

Best regards,
{{organization_name}}
```

## Best Practices

1. **Always include fallbacks**: Not all fields may have values
2. **Test templates**: Send test emails before going live
3. **Use appropriate variables**: Match variables to email type
4. **Keep it readable**: Don't overuse variables
5. **Format dates**: Consider adding date formatting logic
6. **Handle missing data**: Some members may not have phone/address

## Troubleshooting

### Variable Not Replaced
- Check spelling: `{{first_name}}` not `{{firstname}}`
- Ensure field exists in database
- Verify variable is in substitution logic
- Check that data is available at email send time

### Empty Variable
- Database field may be null
- Check data was saved during signup/approval
- Verify variable substitution code includes the field

### Wrong Value
- Check which database record is being used
- Verify the join between tables (profiles, memberships, etc.)
- Ensure correct membership year is selected

## Support

For questions about adding custom variables or troubleshooting email templates, refer to:
- `src/components/admin/EmailWorkflowsManager.tsx` - Workflow UI
- `src/components/auth/SignupFormEnhanced.tsx` - Email sending logic
- `RESEND_INTEGRATION.md` - Email service setup
