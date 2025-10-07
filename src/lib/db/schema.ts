import { pgTable, serial, varchar, text, timestamp, boolean, integer, jsonb, date, decimal, uuid, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table - Enhanced with new fields
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  avatar: varchar('avatar', { length: 500 }),
  phone: varchar('phone', { length: 20 }),
  bio: text('bio'),
  isPublic: boolean('is_public').default(false),
  language: varchar('language', { length: 10 }).default('en'),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: varchar('two_factor_secret', { length: 100 }),
  referralCode: varchar('referral_code', { length: 20 }).unique(),
  referredBy: integer('referred_by').references(() => users.id),
  lastLoginAt: timestamp('last_login_at'),
  emailVerified: boolean('email_verified').default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 100 }),
  passwordResetToken: varchar('password_reset_token', { length: 100 }),
  passwordResetExpires: timestamp('password_reset_expires'),
  onboardingCompleted: boolean('onboarding_completed').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    emailIdx: index('users_email_idx').on(table.email),
    referralCodeIdx: index('users_referral_code_idx').on(table.referralCode),
    referredByIdx: index('users_referred_by_idx').on(table.referredBy),
  };
});

// User roles
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  permissions: jsonb('permissions').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow(),
});

// User role assignments
export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at').defaultNow(),
}, (table) => {
  return {
    userRoleIdx: index('user_roles_user_role_idx').on(table.userId, table.roleId),
  };
});

// Membership types
export const membershipTypes = pgTable('membership_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).default('0.00'),
  durationMonths: integer('duration_months').default(12),
  benefits: jsonb('benefits').$type<string[]>().default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Memberships
export const memberships = pgTable('memberships', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  membershipTypeId: integer('membership_type_id').references(() => membershipTypes.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: varchar('status', { length: 20 }).default('active'), // active, expired, cancelled, pending
  autoRenew: boolean('auto_renew').default(true),
  renewalReminderSent: boolean('renewal_reminder_sent').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    userIdx: index('memberships_user_idx').on(table.userId),
    statusIdx: index('memberships_status_idx').on(table.status),
    endDateIdx: index('memberships_end_date_idx').on(table.endDate),
  };
});

// Member tags
export const memberTags = pgTable('member_tags', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  color: varchar('color', { length: 7 }).default('#6B7280'), // Hex color
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Member tag assignments
export const memberTagAssignments = pgTable('member_tag_assignments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => memberTags.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at').defaultNow(),
}, (table) => {
  return {
    userTagIdx: index('member_tag_assignments_user_tag_idx').on(table.userId, table.tagId),
  };
});

// Events
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  location: varchar('location', { length: 200 }),
  address: text('address'),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  maxAttendees: integer('max_attendees'),
  registrationDeadline: timestamp('registration_deadline'),
  isPublic: boolean('is_public').default(true),
  requiresApproval: boolean('requires_approval').default(false),
  qrCheckinCode: varchar('qr_checkin_code', { length: 50 }).unique(),
  status: varchar('status', { length: 20 }).default('draft'), // draft, published, cancelled, completed
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    startDateIdx: index('events_start_date_idx').on(table.startDate),
    statusIdx: index('events_status_idx').on(table.status),
    qrCodeIdx: index('events_qr_code_idx').on(table.qrCheckinCode),
  };
});

// Event registrations
export const eventRegistrations = pgTable('event_registrations', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).default('registered'), // registered, attended, cancelled, no_show
  qrCode: varchar('qr_code', { length: 100 }).unique(),
  checkinAt: timestamp('checkin_at'),
  registeredAt: timestamp('registered_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    eventUserIdx: index('event_registrations_event_user_idx').on(table.eventId, table.userId),
    statusIdx: index('event_registrations_status_idx').on(table.status),
    qrCodeIdx: index('event_registrations_qr_code_idx').on(table.qrCode),
  };
});

// Documents
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  category: varchar('category', { length: 100 }),
  tags: jsonb('tags').$type<string[]>().default([]),
  isPublic: boolean('is_public').default(false),
  requiresApproval: boolean('requires_approval').default(false),
  approvalStatus: varchar('approval_status', { length: 20 }).default('pending'), // pending, approved, rejected
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  downloadCount: integer('download_count').default(0),
  version: integer('version').default(1),
  uploadedBy: integer('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    categoryIdx: index('documents_category_idx').on(table.category),
    approvalStatusIdx: index('documents_approval_status_idx').on(table.approvalStatus),
    uploadedByIdx: index('documents_uploaded_by_idx').on(table.uploadedBy),
  };
});

// Document versions
export const documentVersions = pgTable('document_versions', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileSize: integer('file_size'),
  changes: text('changes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    documentVersionIdx: index('document_versions_document_version_idx').on(table.documentId, table.version),
  };
});

// Email campaigns
export const emailCampaigns = pgTable('email_campaigns', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  subject: varchar('subject', { length: 200 }).notNull(),
  content: text('content').notNull(),
  template: varchar('template', { length: 100 }).default('default'),
  fromName: varchar('from_name', { length: 100 }),
  fromEmail: varchar('from_email', { length: 255 }),
  recipientFilter: jsonb('recipient_filter').$type<Record<string, any>>(),
  recipientCount: integer('recipient_count').default(0),
  sentCount: integer('sent_count').default(0),
  openedCount: integer('opened_count').default(0),
  clickedCount: integer('clicked_count').default(0),
  status: varchar('status', { length: 20 }).default('draft'), // draft, scheduled, sending, sent, cancelled
  scheduledFor: timestamp('scheduled_for'),
  sentAt: timestamp('sent_at'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    statusIdx: index('email_campaigns_status_idx').on(table.status),
    scheduledForIdx: index('email_campaigns_scheduled_for_idx').on(table.scheduledFor),
  };
});

// Committees
export const committees = pgTable('committees', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  purpose: text('purpose'),
  meetingSchedule: varchar('meeting_schedule', { length: 100 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Committee positions
export const committeePositions = pgTable('committee_positions', {
  id: serial('id').primaryKey(),
  committeeId: integer('committee_id').notNull().references(() => committees.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  isVacant: boolean('is_vacant').default(true),
  termLength: integer('term_length'), // in months
    maxTerms: integer('max_terms'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Committee assignments
export const committeeAssignments = pgTable('committee_assignments', {
  id: serial('id').primaryKey(),
  committeeId: integer('committee_id').notNull().references(() => committees.id, { onDelete: 'cascade' }),
  positionId: integer('position_id').notNull().references(() => committeePositions.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    committeeUserIdx: index('committee_assignments_committee_user_idx').on(table.committeeId, table.userId),
    positionIdx: index('committee_assignments_position_idx').on(table.positionId),
  };
});

// Digital cards
export const digitalCards = pgTable('digital_cards', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  membershipId: integer('membership_id').references(() => memberships.id, { onDelete: 'cascade' }),
  cardType: varchar('card_type', { length: 50 }).notNull(), // google_wallet, apple_wallet, qr_code
  cardData: jsonb('card_data').$type<Record<string, any>>().notNull(),
  qrCode: varchar('qr_code', { length: 100 }).unique(),
  serialNumber: varchar('serial_number', { length: 100 }).unique(),
  isActive: boolean('is_active').default(true),
  expiresAt: timestamp('expires_at'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    userCardTypeIdx: index('digital_cards_user_card_type_idx').on(table.userId, table.cardType),
    qrCodeIdx: index('digital_cards_qr_code_idx').on(table.qrCode),
    serialNumberIdx: index('digital_cards_serial_number_idx').on(table.serialNumber),
  };
});

// Surveys
export const surveys = pgTable('surveys', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  questions: jsonb('questions').$type<any[]>().notNull(),
    targetAudience: jsonb('target_audience').$type<Record<string, any>>(),
  isAnonymous: boolean('is_anonymous').default(false),
  allowMultipleResponses: boolean('allow_multiple_responses').default(false),
  status: varchar('status', { length: 20 }).default('draft'), // draft, published, closed
  publishedAt: timestamp('published_at'),
  closedAt: timestamp('closed_at'),
  responseCount: integer('response_count').default(0),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    statusIdx: index('surveys_status_idx').on(table.status),
    publishedAtIdx: index('surveys_published_at_idx').on(table.publishedAt),
  };
});

// Survey responses
export const surveyResponses = pgTable('survey_responses', {
  id: serial('id').primaryKey(),
  surveyId: integer('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  responses: jsonb('responses').$type<Record<string, any>>().notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  completedAt: timestamp('completed_at').defaultNow(),
}, (table) => {
  return {
    surveyUserIdx: index('survey_responses_survey_user_idx').on(table.surveyId, table.userId),
    completedAtIdx: index('survey_responses_completed_at_idx').on(table.completedAt),
  };
});

// Volunteer opportunities
export const volunteerOpportunities = pgTable('volunteer_opportunities', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  requirements: text('requirements'),
  location: varchar('location', { length: 200 }),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  maxVolunteers: integer('max_volunteers'),
    hoursPerVolunteer: integer('hours_per_volunteer'),
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    startDateIdx: index('volunteer_opportunities_start_date_idx').on(table.startDate),
    isActiveIdx: index('volunteer_opportunities_is_active_idx').on(table.isActive),
  };
});

// Volunteer assignments
export const volunteerAssignments = pgTable('volunteer_assignments', {
  id: serial('id').primaryKey(),
  opportunityId: integer('opportunity_id').notNull().references(() => volunteerOpportunities.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).default('assigned'), // assigned, completed, cancelled, no_show
  hoursCompleted: integer('hours_completed').default(0),
  notes: text('notes'),
  assignedAt: timestamp('assigned_at').defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => {
  return {
    opportunityUserIdx: index('volunteer_assignments_opportunity_user_idx').on(table.opportunityId, table.userId),
    statusIdx: index('volunteer_assignments_status_idx').on(table.status),
  };
});

// Workflows
export const workflows = pgTable('workflows', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  trigger: jsonb('trigger').$type<Record<string, any>>().notNull(),
  conditions: jsonb('conditions').$type<Record<string, any>>(),
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Workflow steps
export const workflowSteps = pgTable('workflow_steps', {
  id: serial('id').primaryKey(),
  workflowId: integer('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  stepOrder: integer('step_order').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  action: jsonb('action').$type<Record<string, any>>().notNull(),
  conditions: jsonb('conditions').$type<Record<string, any>>(),
  delay: integer('delay'), // delay in seconds
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    workflowOrderIdx: index('workflow_steps_workflow_order_idx').on(table.workflowId, table.stepOrder),
  };
});

// Workflow executions
export const workflowExecutions = pgTable('workflow_executions', {
  id: serial('id').primaryKey(),
  workflowId: integer('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  triggerData: jsonb('trigger_data').$type<Record<string, any>>(),
  status: varchar('status', { length: 20 }).default('running'), // running, completed, failed, cancelled
  currentStep: integer('current_step').default(0),
  executedAt: timestamp('executed_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Communication log
export const communicationLog = pgTable('communication_log', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // email, sms, push, in_app
  direction: varchar('direction', { length: 10 }).notNull(), // inbound, outbound
  subject: varchar('subject', { length: 200 }),
  content: text('content'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  status: varchar('status', { length: 20 }).default('sent'), // sent, delivered, opened, clicked, failed
  sentAt: timestamp('sent_at').defaultNow(),
}, (table) => {
  return {
    userTypeIdx: index('communication_log_user_type_idx').on(table.userId, table.type),
    sentAtIdx: index('communication_log_sent_at_idx').on(table.sentAt),
  };
});

// Analytics events
export const analyticsEvents = pgTable('analytics_events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  event: varchar('event', { length: 100 }).notNull(),
  properties: jsonb('properties').$type<Record<string, any>>(),
  sessionId: varchar('session_id', { length: 100 }),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  timestamp: timestamp('timestamp').defaultNow(),
}, (table) => {
  return {
    userEventIdx: index('analytics_events_user_event_idx').on(table.userId, table.event),
    timestampIdx: index('analytics_events_timestamp_idx').on(table.timestamp),
    sessionIdx: index('analytics_events_session_idx').on(table.sessionId),
  };
});

// Organization settings
export const organizationSettings = pgTable('organization_settings', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  logo: varchar('logo', { length: 500 }),
  primaryColor: varchar('primary_color', { length: 7 }).default('#3B82F6'),
  secondaryColor: varchar('secondary_color', { length: 7 }).default('#1E40AF'),
  fontFamily: varchar('font_family', { length: 100 }).default('Inter'),
  emailHeader: text('email_header'),
  emailFooter: text('email_footer'),
  favicon: varchar('favicon', { length: 500 }),
  socialLinks: jsonb('social_links').$type<Record<string, string>>(),
  customCss: text('custom_css'),
  settings: jsonb('settings').$type<Record<string, any>>(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  eventRegistrations: many(eventRegistrations),
  committeeAssignments: many(committeeAssignments),
  digitalCards: many(digitalCards),
  volunteerAssignments: many(volunteerAssignments),
  userRoles: many(userRoles),
  communicationLogs: many(communicationLog),
  analyticsEvents: many(analyticsEvents),
  referredUsers: many(users, {
    relationName: 'referrer',
  }),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  membershipType: one(membershipTypes, {
    fields: [memberships.membershipTypeId],
    references: [membershipTypes.id],
  }),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  registrations: many(eventRegistrations),
}));

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(events, {
    fields: [eventRegistrations.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventRegistrations.userId],
    references: [users.id],
  }),
}));

export const committeesRelations = relations(committees, ({ many }) => ({
  positions: many(committeePositions),
  assignments: many(committeeAssignments),
}));

export const committeePositionsRelations = relations(committeePositions, ({ one, many }) => ({
  committee: one(committees, {
    fields: [committeePositions.committeeId],
    references: [committees.id],
  }),
  assignments: many(committeeAssignments),
}));

export const surveysRelations = relations(surveys, ({ many }) => ({
  responses: many(surveyResponses),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
  survey: one(surveys, {
    fields: [surveyResponses.surveyId],
    references: [surveys.id],
  }),
  user: one(users, {
    fields: [surveyResponses.userId],
    references: [users.id],
  }),
}));

export const workflowsRelations = relations(workflows, ({ many }) => ({
  steps: many(workflowSteps),
  executions: many(workflowExecutions),
}));

export const workflowStepsRelations = relations(workflowSteps, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowSteps.workflowId],
    references: [workflows.id],
  }),
}));

export const volunteerOpportunitiesRelations = relations(volunteerOpportunities, ({ many }) => ({
  assignments: many(volunteerAssignments),
}));

export const volunteerAssignmentsRelations = relations(volunteerAssignments, ({ one }) => ({
  opportunity: one(volunteerOpportunities, {
    fields: [volunteerAssignments.opportunityId],
    references: [volunteerOpportunities.id],
  }),
  user: one(users, {
    fields: [volunteerAssignments.userId],
    references: [users.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type MemberTag = typeof memberTags.$inferSelect;
export type NewMemberTag = typeof memberTags.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Survey = typeof surveys.$inferSelect;
export type NewSurvey = typeof surveys.$inferInsert;
export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;