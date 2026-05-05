// ---------------------------------------------------------------------------
// Domain enums
// ---------------------------------------------------------------------------
export type UserRole = 'client' | 'coach' | 'admin';
export type EnrollmentStatus = 'prospect' | 'active' | 'paused' | 'completed';
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type SessionType = 'assessment' | 'coaching' | 'follow_up' | 'check_in';
export type ContentType = 'video' | 'audio' | 'article' | 'exercise' | 'assessment';
export type Pillar =
  | 'activation_mind'
  | 'body_awareness'
  | 'training_architecture'
  | 'performance_recovery'
  | 'nutrition_lifestyle'
  | 'goal_progression';

export type ProgramSlug =
  | 'future-body-reset'
  | 'metabolic-reversal-system'
  | 'posture-recode-protocol'
  | 'rebuild-rehab-system'
  | 'corporate-performance-reset'
  | 'peak-performance-lab'
  | 'longevity-vitality-engine';

// ---------------------------------------------------------------------------
// Database row types (mirrors Supabase tables)
// ---------------------------------------------------------------------------
export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  dob: string | null;
  gender: 'male' | 'female' | 'other' | null;
  health_goals: string[];
  conditions: string[];
  avatar_url: string | null;
  push_token: string | null;           
  assigned_coach_id: string | null;    
  onboarding_completed: boolean;       
  onboarding_completed_at: string | null; 
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  name: string;
  slug: ProgramSlug;
  tagline: string;
  description: string;
  icon_url: string | null;
  duration_weeks: number;
  target_conditions: string[];
  is_active: boolean;
  created_at: string;
}

export interface Enrollment {
  id: string;
  client_id: string;
  program_id: string;
  coach_id: string | null;
  status: EnrollmentStatus;
  current_week: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  // Joined
  program?: Program;
  coach?: Profile;
}

export interface Session {
  id: string;
  client_id: string;
  coach_id: string;
  enrollment_id: string;
  scheduled_at: string;
  duration_min: number;
  type: SessionType;
  status: SessionStatus;
  notes_pre: string | null;
  notes_post: string | null;
  created_at: string;
  // Joined
  client?: Profile;
  coach?: Profile;
}

export interface DailyCheckin {
  id: string;
  client_id: string;
  enrollment_id: string;
  date: string;
  mood: number;           // 1–10
  energy: number;         // 1–10
  sleep_hrs: number;      // 0–12
  pain_level: number;     // 0–10
  notes: string | null;
  created_at: string;
}

export interface ProgressMetric {
  id: string;
  client_id: string;
  enrollment_id: string;
  recorded_at: string;
  weight_kg: number | null;
  bmi: number | null;
  posture_score: number | null;   // 0–100
  fitness_score: number | null;   // 0–100
  recovery_score: number | null;  // 0–100
  longevity_score: number | null; // 0–100
  notes: string | null;
}

export interface ProgramContent {
  id: string;
  program_id: string;
  week_num: number;
  day_num: number | null;
  title: string;
  description: string | null;
  type: ContentType;
  content_url: string | null;
  pillar: Pillar;
  duration_min: number | null;
  order_index: number;
}

export interface Message {
  id: string;
  enrollment_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  sent_at: string;
  read_at: string | null;
}
// ============================================================
// ADD THESE TO THE BOTTOM OF src/types/index.ts
// (paste above the Database interface)
// ============================================================

export type PlanStatus = 'draft' | 'active' | 'completed' | 'archived';
export type TrackType = 'workout' | 'nutrition' | 'recovery' | 'lifestyle' | 'posture_rehab' | 'mindset';
export type ItemType = 'exercise' | 'meal_guide' | 'protocol' | 'habit' | 'note';

export interface Plan {
  id: string;
  client_id: string;
  coach_id: string;
  title: string;
  status: PlanStatus;
  current_phase: number;
  total_phases: number;
  phase_duration_weeks: number;
  start_date: string | null;
  end_date: string | null;
  coach_overview: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  // Joined
  client?: Profile;
  tracks?: PlanTrack[];
}

export interface PlanTrack {
  id: string;
  plan_id: string;
  track_type: TrackType;
  title: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  // Joined
  items?: PlanItem[];
}

export interface PlanItem {
  id: string;
  track_id: string;
  phase: number;
  week_number: number;
  day_of_week: string[];
  item_type: ItemType;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  video_url: string | null;
  coach_note: string | null;
  sort_order: number;
  created_at: string;
  // Joined
  is_completed?: boolean;
}

export interface PlanItemCompletion {
  id: string;
  plan_item_id: string;
  client_id: string;
  completed_date: string;
  completed_at: string;
  notes: string | null;
}



// ---------------------------------------------------------------------------
// Supabase Database type (used with createClient<Database>)
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      programs: {
        Row: Program;
        Insert: Omit<Program, 'id' | 'created_at'>;
        Update: Partial<Omit<Program, 'id' | 'created_at'>>;
      };
      enrollments: {
        Row: Enrollment;
        Insert: Omit<Enrollment, 'id' | 'created_at' | 'program' | 'coach'>;
        Update: Partial<Omit<Enrollment, 'id' | 'created_at' | 'program' | 'coach'>>;
      };
      sessions: {
        Row: Session;
        Insert: Omit<Session, 'id' | 'created_at' | 'client' | 'coach'>;
        Update: Partial<Omit<Session, 'id' | 'created_at' | 'client' | 'coach'>>;
      };
      daily_checkins: {
        Row: DailyCheckin;
        Insert: Omit<DailyCheckin, 'id' | 'created_at'>;
        Update: Partial<Omit<DailyCheckin, 'id' | 'created_at'>>;
      };
      progress_metrics: {
        Row: ProgressMetric;
        Insert: Omit<ProgressMetric, 'id'>;
        Update: Partial<Omit<ProgressMetric, 'id'>>;
      };
      program_content: {
        Row: ProgramContent;
        Insert: Omit<ProgramContent, 'id'>;
        Update: Partial<Omit<ProgramContent, 'id'>>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'sent_at' | 'read_at'>;
        Update: Pick<Message, 'read_at'>;
      };
      plans: {
        Row: Plan;
        Insert: Omit<Plan, 'id' | 'created_at' | 'updated_at' | 'client' | 'tracks'>;
        Update: Partial<Omit<Plan, 'id' | 'created_at' | 'client' | 'tracks'>>;
      };
      plan_tracks: {
        Row: PlanTrack;
        Insert: Omit<PlanTrack, 'id' | 'items'>;
        Update: Partial<Omit<PlanTrack, 'id' | 'items'>>;
      };
      plan_items: {
        Row: PlanItem;
        Insert: Omit<PlanItem, 'id' | 'created_at' | 'is_completed'>;
        Update: Partial<Omit<PlanItem, 'id' | 'created_at' | 'is_completed'>>;
     };
     plan_item_completions: {
     Row: PlanItemCompletion;
     Insert: Omit<PlanItemCompletion, 'id' | 'completed_at'>;
     Update: Partial<Omit<PlanItemCompletion, 'id'>>;
     };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
