# Organization Admin Guide

## Getting Started

Welcome to your organization's membership management system! This guide will help you understand all the features available to you as an organization administrator.

---

## Table of Contents

1. [Dashboard Overview](#dashboard-overview)
2. [Member Management](#member-management)
3. [Membership Types & Years](#membership-types--years)
4. [Email & Communications](#email--communications)
5. [Events Management](#events-management)
6. [Committees](#committees)
7. [Mailing Lists](#mailing-lists)
8. [Reports & Analytics](#reports--analytics)
9. [Settings](#settings)

---

## Dashboard Overview

When you log in as an admin, you'll see the admin dropdown menu in the top right corner with access to:

- **Members** - View and manage all members
- **Pending Approvals** - Review new member applications
- **Membership Types** - Configure membership categories
- **Email Campaigns** - Send newsletters and updates
- **Email Workflows** - Set up automated emails
- **Events Management** - Create and manage events
- **Committees** - Manage committees and positions
- **Custom Domains** - Configure your organization's domain
- **Settings** - Update organization details and branding

---

## Member Management

### Approving New Members

1. Go to **Admin → Pending Approvals**
2. Review the pending member applications
3. For each member:
   - Click **Approve** to accept them
   - Select the **membership year(s)** to assign (e.g., 2024, 2025)
   - Select the **membership type(s)** to assign (e.g., Adult, Associate)
   - You can create **linked profiles** for family members or additional memberships
   - Click **Confirm Approval** to activate the member
4. Approved members will receive a welcome email automatically

**Security Note:** All new signups are inactive until you approve them - this prevents unauthorized access.

### Viewing All Members

1. Go to **Admin → Members**
2. You'll see a list of all active members with:
   - Name and email
   - Membership type and status
   - Current year validity
   - Linked profiles (if any)
3. Click on a member to:
   - Edit their details
   - Add notes
   - View membership history
   - Manage linked profiles

### Editing Member Information

1. Click on a member from the members list
2. Click **Edit Member**
3. Update their information:
   - Personal details (name, email, phone, address)
   - Membership status
   - Notes (internal only, not visible to members)
4. Click **Save Changes**

### Adding Notes to Members

1. Open the member's profile
2. Click **Add Note**
3. Enter your note (visible only to admins)
4. Click **Save Note**

---

## Membership Types & Years

### Creating Membership Types

1. Go to **Admin → Membership Types**
2. Click **Add Membership Type**
3. Fill in the details:
   - **Name** (e.g., "Adult Member", "Family Membership")
   - **Description** (optional)
   - **Fee** (if applicable)
   - **Features** or benefits included
4. Click **Create**

### Managing Membership Years

1. Go to **Admin → Membership Types**
2. Switch to the **Years** tab
3. Click **Add Year**
4. Enter the year (e.g., 2025)
5. Set the start and end dates
6. Click **Create**

**Tip:** You can assign multiple years to a member during approval (useful for members joining late in the year).

---

## Email & Communications

### Creating Email Campaigns

1. Go to **Admin → Email Campaigns**
2. Click **Create Campaign**
3. Fill in the details:
   - **Campaign Title** (internal name)
   - **Mailing List** (select which list to send to)
   - **Email Subject** (what recipients will see)
   - **Email Content** (supports HTML)
   - Use template variables: `{{first_name}}`, `{{last_name}}`, `{{email}}`
4. Click **Create Draft**
5. Review the campaign in the list
6. Click **Send** when ready to send to all subscribers

**Important:** Make sure your Resend domain is verified before sending campaigns.

### Testing Email Campaigns

Before sending a campaign to everyone:
1. Create the campaign as a draft
2. Send a test email to yourself to preview how it looks
3. Make any necessary edits
4. Then send to the full mailing list

### Setting Up Email Workflows (Automated Emails)

1. Go to **Admin → Email Workflows**
2. Click **Create Workflow**
3. Configure the workflow:
   - **Workflow Name** (e.g., "Welcome Email")
   - **Trigger** (when to send: member joins, renewal reminder, etc.)
   - **Email Subject**
   - **Email Template** (supports template variables)
   - **Delay** (optional - send X days after trigger)
4. **Test the workflow** before activating:
   - Click the **Send Test** button
   - Enter your email address
   - Review the test email
5. Click **Activate** when ready

**Template Variables Available:**
- `{{first_name}}` - Member's first name
- `{{last_name}}` - Member's last name
- `{{email}}` - Member's email
- `{{membership_type}}` - Their membership type

---

## Events Management

### Creating Events

1. Go to **Admin → Events Management**
2. Click **Create Event**
3. Fill in the event details:
   - **Title** and **Description**
   - **Start Date/Time** and **End Date/Time**
   - **Location**
   - **Max Attendees** (optional capacity limit)
   - **Registration Required** (yes/no)
4. Click **Create Event**

### Managing Event Registrations

1. Go to **Admin → Events Management**
2. Click on an event to view registrations
3. You can:
   - View all registered attendees
   - Export the attendee list
   - Send emails to attendees
   - Cancel registrations if needed

---

## Committees

### Creating Committees

1. Go to **Admin → Committees**
2. Click **Create Committee**
3. Fill in:
   - **Committee Name** (e.g., "Board of Directors")
   - **Description** (purpose and responsibilities)
   - **Meeting Schedule** (optional)
4. Click **Create**

### Creating Committee Positions

1. Select a committee
2. Click **Add Position**
3. Fill in:
   - **Position Title** (e.g., "Chair", "Secretary", "Treasurer")
   - **Description** (role responsibilities)
   - **Permissions** (select which admin features this position can access)
4. Click **Create Position**

**Available Permissions:**
- Approve Members
- Manage Members
- Manage Memberships
- View Reports
- Export Reports
- Manage Events
- Manage Emails
- Manage Mailing Lists
- Manage Committees
- Manage Settings
- Manage Domains
- Full Admin Access

### Assigning Members to Positions

1. Select a committee and position
2. Click **Assign Member**
3. Select the member from the dropdown
4. Click **Assign**

The member will now have the permissions associated with that position.

---

## Mailing Lists

### Creating Mailing Lists

1. Go to **Mailing Lists** (member view or admin view)
2. Click **Create Mailing List**
3. Fill in:
   - **List Name** (e.g., "Monthly Newsletter")
   - **Description** (what subscribers will receive)
4. Click **Create**

### Adding Subscribers

1. Select a mailing list
2. Click **Add Subscriber**
3. Fill in:
   - **Email Address**
   - **First Name** and **Last Name** (optional)
4. Click **Add Subscriber**

**Tip:** Members can also subscribe themselves from the member dashboard.

### Managing Subscribers

1. View your mailing list
2. You can:
   - See all subscribers
   - Remove subscribers
   - Export the subscriber list
   - View subscription dates

---

## Reports & Analytics

### Viewing Reports

1. Go to **Admin → Reports**
2. Available reports include:
   - Active members by type
   - Membership trends over time
   - Revenue reports (if payment tracking enabled)
   - Event attendance
   - Email campaign performance

### Creating Custom Reports

1. Go to **Admin → Reports**
2. Click **Create Report**
3. Select:
   - **Data Source** (members, events, etc.)
   - **Filters** (membership type, year, status)
   - **Columns** to display
   - **Sort Order**
4. Click **Generate Report**
5. You can save the report for future use

### Exporting Data

1. Open any report
2. Click **Export**
3. Choose format (CSV, Excel, PDF)
4. Download the file

---

## Settings

### Organization Details

1. Go to **Admin → Settings**
2. Update:
   - **Organization Name**
   - **Contact Email** and **Phone**
   - **Logo** (upload an image)
   - **Primary and Secondary Colors** (for branding)
   - **Address**

### Feature Toggles

Enable or disable features for your organization:
- **Digital Membership Cards** (Google/Apple Wallet)
- **Committees** (show/hide committees section)
- **Events** (enable event management)
- **Mailing Lists** (enable email marketing)
- **Badges** (achievement system)

### Custom Domains

1. Go to **Admin → Custom Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourorg.org.uk`)
4. Add the DNS verification records to your domain provider
5. Click **Verify Domain**
6. Once verified, request SSL certificate
7. Your organization will be accessible at your custom domain

---

## Best Practices

### Member Approval
- Review all new members before approving
- Check for duplicate accounts
- Assign the correct membership types and years
- Add internal notes if needed for reference

### Email Campaigns
- Always send a test email first
- Use template variables to personalize emails
- Keep subject lines clear and concise
- Check that your Resend domain is verified

### Data Management
- Regularly export member data as backups
- Keep member information up to date
- Review and clean up mailing lists periodically

### Security
- Never share your admin login credentials
- Review committee position permissions carefully
- Regularly audit who has admin access

---

## Troubleshooting

### Email Campaigns Not Sending
- Verify your Resend domain at resend.com/domains
- Check that subscribers exist in the mailing list
- Ensure the "from" email uses your verified domain

### Members Can't Log In
- Check if the member is approved (status = "active")
- Verify their email address is correct
- Ask them to reset their password if needed

### Custom Domain Not Working
- Verify DNS records are added correctly
- Allow up to 48 hours for DNS propagation
- Check that SSL certificate is generated

---

## Getting Help

If you need assistance:
1. Check this guide first
2. Review the system documentation in `replit.md`
3. Contact your system administrator
4. Email technical support with specific error messages

---

**Last Updated:** October 2025
