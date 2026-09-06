/**
 * Hand-written to match supabase/migrations. Kept in the shape the Supabase CLI
 * emits, so once your project exists you can replace this file wholesale:
 *
 *   pnpm dlx supabase gen types typescript --project-id <your-ref> \
 *     > src/lib/supabase/types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Array<Json>

export type ProposalStatus = 'draft' | 'sent' | 'won' | 'lost' | 'archived'

export type BillingPlan = 'free' | 'solo' | 'studio'

export type PageSection =
  | 'cover'
  | 'summary'
  | 'scope'
  | 'timeline'
  | 'pricing'
  | 'terms'
  | 'case_study'
  | 'team'
  | 'other'

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  company_name: string | null
  created_at: string
  /** Set when the signup notification was sent. Claimed atomically. */
  signup_notified_at: string | null
}

type SubscriptionRow = {
  user_id: string
  plan: BillingPlan
  /** Stripe's own status string, stored verbatim. Null before the first sync. */
  status: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  /** When a scheduled cancellation takes effect. Null unless one is scheduled. */
  cancel_at: string | null
  updated_at: string
}

type CompRow = {
  user_id: string
  plan: BillingPlan
  /** Null runs indefinitely. */
  until: string | null
  note: string | null
  granted_at: string
}

type StudioWaitlistRow = {
  id: string
  email: string
  /** Set only when the person happened to be signed in. */
  user_id: string | null
  source: string
  created_at: string
}

type ProposalRow = {
  id: string
  owner_id: string
  title: string
  client_name: string
  deal_value_cents: number | null
  currency: string
  storage_path: string
  page_count: number
  status: ProposalStatus
  outcome_at: string | null
  first_open_notified_at: string | null
  created_at: string
  updated_at: string
}

type ProposalPageRow = {
  id: string
  proposal_id: string
  page_number: number
  section: PageSection
  /** True while `section` is the classifier's guess, not the owner's choice. */
  section_auto: boolean
  label: string | null
}

type ShareLinkRow = {
  id: string
  proposal_id: string
  token: string
  recipient_name: string | null
  recipient_email: string | null
  expires_at: string | null
  revoked_at: string | null
  created_at: string
}

type VisitRow = {
  id: string
  share_link_id: string
  proposal_id: string
  visitor_id: string
  visit_seq: number
  started_at: string
  last_seen_at: string
  engaged_ms: number
  device_type: string | null
  os: string | null
  browser: string | null
  country: string | null
  city: string | null
  referrer: string | null
  ip_hash: string | null
  is_bot: boolean
  bot_reason: string | null
  is_qualified: boolean
}

type PageViewRow = {
  id: string
  visit_id: string
  proposal_id: string
  page_number: number
  engaged_ms: number
  view_count: number
  first_seen_at: string
  last_seen_at: string
}

type EventRow = {
  id: number
  visit_id: string
  type: string
  page_number: number | null
  payload: Json | null
  created_at: string
}

type Rel = {
  foreignKeyName: string
  columns: Array<string>
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: Array<string>
}

const _rel = (): Array<Rel> => []
export type Relationships = ReturnType<typeof _rel>

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Partial<ProfileRow> & { id: string }
        Update: Partial<ProfileRow>
        Relationships: []
      }
      proposals: {
        Row: ProposalRow
        Insert: Partial<ProposalRow> & Pick<ProposalRow, 'owner_id' | 'title' | 'client_name' | 'storage_path'>
        Update: Partial<ProposalRow>
        Relationships: [
          {
            foreignKeyName: 'proposals_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      proposal_pages: {
        Row: ProposalPageRow
        Insert: Partial<ProposalPageRow> & Pick<ProposalPageRow, 'proposal_id' | 'page_number'>
        Update: Partial<ProposalPageRow>
        Relationships: [
          {
            foreignKeyName: 'proposal_pages_proposal_id_fkey'
            columns: ['proposal_id']
            isOneToOne: false
            referencedRelation: 'proposals'
            referencedColumns: ['id']
          },
        ]
      }
      subscriptions: {
        Row: SubscriptionRow
        Insert: Partial<SubscriptionRow> & Pick<SubscriptionRow, 'user_id'>
        Update: Partial<SubscriptionRow>
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      studio_waitlist: {
        Row: StudioWaitlistRow
        Insert: Partial<StudioWaitlistRow> & Pick<StudioWaitlistRow, 'email'>
        Update: Partial<StudioWaitlistRow>
        Relationships: []
      }
      comps: {
        Row: CompRow
        Insert: Partial<CompRow> & Pick<CompRow, 'user_id'>
        Update: Partial<CompRow>
        Relationships: [
          {
            foreignKeyName: 'comps_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      share_links: {
        Row: ShareLinkRow
        Insert: Partial<ShareLinkRow> & Pick<ShareLinkRow, 'proposal_id' | 'token'>
        Update: Partial<ShareLinkRow>
        Relationships: [
          {
            foreignKeyName: 'share_links_proposal_id_fkey'
            columns: ['proposal_id']
            isOneToOne: false
            referencedRelation: 'proposals'
            referencedColumns: ['id']
          },
        ]
      }
      visits: {
        Row: VisitRow
        Insert: Partial<VisitRow> & Pick<VisitRow, 'share_link_id' | 'proposal_id' | 'visitor_id'>
        Update: Partial<VisitRow>
        Relationships: [
          {
            foreignKeyName: 'visits_share_link_id_fkey'
            columns: ['share_link_id']
            isOneToOne: false
            referencedRelation: 'share_links'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'visits_proposal_id_fkey'
            columns: ['proposal_id']
            isOneToOne: false
            referencedRelation: 'proposals'
            referencedColumns: ['id']
          },
        ]
      }
      page_views: {
        Row: PageViewRow
        Insert: Partial<PageViewRow> & Pick<PageViewRow, 'visit_id' | 'proposal_id' | 'page_number'>
        Update: Partial<PageViewRow>
        Relationships: [
          {
            foreignKeyName: 'page_views_visit_id_fkey'
            columns: ['visit_id']
            isOneToOne: false
            referencedRelation: 'visits'
            referencedColumns: ['id']
          },
        ]
      }
      events: {
        Row: EventRow
        Insert: Partial<EventRow> & Pick<EventRow, 'visit_id' | 'type'>
        Update: Partial<EventRow>
        Relationships: [
          {
            foreignKeyName: 'events_visit_id_fkey'
            columns: ['visit_id']
            isOneToOne: false
            referencedRelation: 'visits'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      proposal_stats: {
        Row: {
          proposal_id: string
          owner_id: string
          visit_count: number
          viewer_count: number
          total_engaged_ms: number
          last_viewed_at: string | null
          pricing_engaged_ms: number
        }
        Relationships: []
      }
    }
    Functions: {
      record_engagement: {
        Args: { p_visit_id: string; p_engaged_ms: number; p_pages: Json }
        Returns: undefined
      }
      has_active_plan: {
        Args: { uid: string }
        Returns: boolean
      }
      active_proposal_count: {
        Args: { uid: string; excluding?: string | null }
        Returns: number
      }
      can_create_proposal: {
        Args: { uid: string }
        Returns: boolean
      }
      grant_comp: {
        Args: {
          user_email: string
          comp_plan?: BillingPlan
          until?: string | null
          note?: string | null
        }
        Returns: CompRow
      }
      revoke_comp: {
        Args: { user_email: string }
        Returns: boolean
      }
    }
    Enums: {
      proposal_status: ProposalStatus
      page_section: PageSection
      billing_plan: BillingPlan
    }
    CompositeTypes: Record<never, never>
  }
}
