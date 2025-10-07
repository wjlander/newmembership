import { pgTable, uuid, text, timestamp, boolean, integer, decimal, date, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  domain: text('domain').unique(),
  logo_url: text('logo_url'),
  primary_color: text('primary_color').default('#3B82F6'),
  secondary_color: text('secondary_color').default('#1E40AF'),
  contact_email: text('contact_email').notNull(),
  contact_phone: text('contact_phone'),
  address: jsonb('address'),
  settings: jsonb('settings').default(sql`'{}'::jsonb`),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  slugIdx: index('idx_organizations_slug').on(table.slug),
  domainIdx: index('idx_organizations_domain').on(table.domain),
}));

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id'),
  organization_id: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  primary_profile_id: uuid('primary_profile_id').references((): any => profiles.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  phone: text('phone'),
  address: jsonb('address'),
  role: text('role').default('member'),
  is_active: boolean('is_active').default(true),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_profiles_user_id').on(table.user_id),
  organizationIdIdx: index('idx_profiles_organization_id').on(table.organization_id),
  primaryProfileIdx: index('idx_profiles_primary_profile_id').on(table.primary_profile_id),
  emailIdx: index('idx_profiles_email').on(table.email),
  userOrgUnique: unique('profiles_user_id_organization_id_key').on(table.user_id, table.organization_id),
}));

export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  profile_id: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
  membership_year: integer('membership_year').notNull(),
  start_date: date('start_date').notNull(),
  end_date: date('end_date').notNull(),
  status: text('status').default('active'),
  membership_type: text('membership_type').default('standard'),
  amount_paid: decimal('amount_paid', { precision: 10, scale: 2 }),
  payment_date: timestamp('payment_date', { withTimezone: true }),
  payment_reference: text('payment_reference'),
  benefits: jsonb('benefits').default(sql`'[]'::jsonb`),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  organizationIdIdx: index('idx_memberships_organization_id').on(table.organization_id),
  profileIdIdx: index('idx_memberships_profile_id').on(table.profile_id),
  yearIdx: index('idx_memberships_year').on(table.membership_year),
  statusIdx: index('idx_memberships_status').on(table.status),
  orgProfileYearTypeUnique: unique('memberships_org_profile_year_type_key').on(table.organization_id, table.profile_id, table.membership_year, table.membership_type),
}));

export const digitalCards = pgTable('digital_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  membership_id: uuid('membership_id').references(() => memberships.id, { onDelete: 'cascade' }),
  card_type: text('card_type').notNull(),
  card_id: text('card_id').notNull(),
  pass_url: text('pass_url'),
  qr_code_data: text('qr_code_data'),
  is_active: boolean('is_active').default(true),
  issued_at: timestamp('issued_at', { withTimezone: true }).defaultNow(),
  expires_at: timestamp('expires_at', { withTimezone: true }),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  membershipIdIdx: index('idx_digital_cards_membership_id').on(table.membership_id),
  membershipCardTypeUnique: unique('digital_cards_membership_id_card_type_key').on(table.membership_id, table.card_type),
}));

export const emailCampaigns = pgTable('email_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  content: text('content').notNull(),
  template_id: text('template_id'),
  status: text('status').default('draft'),
  scheduled_at: timestamp('scheduled_at', { withTimezone: true }),
  sent_at: timestamp('sent_at', { withTimezone: true }),
  recipient_count: integer('recipient_count').default(0),
  delivered_count: integer('delivered_count').default(0),
  opened_count: integer('opened_count').default(0),
  clicked_count: integer('clicked_count').default(0),
  bounced_count: integer('bounced_count').default(0),
  created_by: uuid('created_by').references(() => profiles.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  organizationIdIdx: index('idx_email_campaigns_organization_id').on(table.organization_id),
}));

export const emailSubscribers = pgTable('email_subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  first_name: text('first_name'),
  last_name: text('last_name'),
  status: text('status').default('subscribed'),
  subscription_date: timestamp('subscription_date', { withTimezone: true }).defaultNow(),
  unsubscription_date: timestamp('unsubscription_date', { withTimezone: true }),
  tags: text('tags').array().default(sql`ARRAY[]::text[]`),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  organizationIdIdx: index('idx_email_subscribers_organization_id').on(table.organization_id),
  emailIdx: index('idx_email_subscribers_email').on(table.email),
  orgEmailUnique: unique('email_subscribers_organization_id_email_key').on(table.organization_id, table.email),
}));

export const renewalWorkflows = pgTable('renewal_workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  renewal_period_start: date('renewal_period_start').notNull(),
  renewal_period_end: date('renewal_period_end').notNull(),
  reminder_schedule: jsonb('reminder_schedule').default(sql`'[]'::jsonb`),
  email_template_id: text('email_template_id'),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  organizationIdIdx: index('idx_renewal_workflows_organization_id').on(table.organization_id),
}));

export const emailWorkflows = pgTable('email_workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  trigger_event: text('trigger_event').notNull(),
  conditions: jsonb('conditions').default(sql`'{}'::jsonb`),
  recipient_type: text('recipient_type').default('email').notNull(),
  recipient_email: text('recipient_email'),
  recipient_name: text('recipient_name'),
  recipient_position_id: uuid('recipient_position_id').references(() => committeePositions.id, { onDelete: 'set null' }),
  email_subject: text('email_subject').notNull(),
  email_template: text('email_template').notNull(),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  organizationIdIdx: index('idx_email_workflows_organization_id').on(table.organization_id),
  recipientPositionIdx: index('idx_email_workflows_recipient_position_id').on(table.recipient_position_id),
}));

export const committees = pgTable('committees', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').notNull(),
  mailing_list_id: text('mailing_list_id'),
  is_active: boolean('is_active').default(true),
  member_count: integer('member_count').default(0),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  organizationIdIdx: index('idx_committees_organization_id').on(table.organization_id),
  slugIdx: index('idx_committees_slug').on(table.slug),
  orgSlugUnique: unique('committees_organization_id_slug_key').on(table.organization_id, table.slug),
}));

export const committeePositions = pgTable('committee_positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  permissions: jsonb('permissions').default(sql`'[]'::jsonb`),
  display_order: integer('display_order').default(0),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  organizationIdIdx: index('idx_committee_positions_organization_id').on(table.organization_id),
  displayOrderIdx: index('idx_committee_positions_display_order').on(table.display_order),
  orgNameUnique: unique('committee_positions_organization_id_name_key').on(table.organization_id, table.name),
}));

export const committeeMembers = pgTable('committee_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  committee_id: uuid('committee_id').references(() => committees.id, { onDelete: 'cascade' }).notNull(),
  profile_id: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  position_id: uuid('position_id').references(() => committeePositions.id, { onDelete: 'set null' }),
  joined_at: timestamp('joined_at', { withTimezone: true }).defaultNow(),
  end_date: date('end_date'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  committeeIdIdx: index('idx_committee_members_committee_id').on(table.committee_id),
  profileIdIdx: index('idx_committee_members_profile_id').on(table.profile_id),
  positionIdIdx: index('idx_committee_members_position_id').on(table.position_id),
  committeeProfileUnique: unique('committee_members_committee_id_profile_id_key').on(table.committee_id, table.profile_id),
}));

