import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// In-scope domains for this build — Power, Balance, Coordination, and
// athlete-population Agility/Speed are deliberately NOT implemented (no
// rigorous published normative tables were found for them). The DB enum
// allows all 9 for future-proofing, but the app only ever scores these 4.
export type FitnessDomain = 'strength' | 'flexibility' | 'endurance' | 'agility';
export type EvidenceStrength = 'strong' | 'moderate' | 'limited';
export type ScoreStatus = 'scored' | 'age_out_of_range';
export type EnduranceProtocol = '6-Minute Walk' | '2-Minute Step Test';

export interface FitnessAssessment {
  id: string;
  client_id: string;
  coach_id: string;
  assessment_date: string;
  client_age_at_assessment: number;
  client_gender: 'male' | 'female';
  is_athlete: boolean | null;
  notes: string | null;
  created_at: string;
}

export interface FitnessDomainResult {
  id: string;
  assessment_id: string;
  domain: FitnessDomain;
  raw_result_primary: number;
  raw_result_secondary: number | null;
  raw_result_unit: string;
  test_protocol_used: string;
  domain_score: number | null;
  score_status: ScoreStatus;
  evidence_strength: EvidenceStrength;
  created_at: string;
}

export const fitnessKeys = {
  clientAssessments: (clientId: string) => ['fitness', clientId, 'assessments'] as const,
  assessmentResults:  (assessmentId: string) => ['fitness', 'assessment', assessmentId, 'results'] as const,
};

// ── Scoring helpers ─────────────────────────────────────────────────────────
// Thin wrapper around the calculate_domain_score RPC for single-test domains
// (Endurance, Agility in this build).
export async function calculateDomainScore(args: {
  domain: FitnessDomain;
  testProtocol: string;
  rawResult: number;
  clientAge: number;
  clientGender: 'male' | 'female';
  population?: 'general' | 'athlete';
}): Promise<{ domainScore: number | null; scoreStatus: ScoreStatus; matchedTableId: string | null }> {
  const { data, error } = await supabase.rpc('calculate_domain_score', {
    p_domain: args.domain,
    p_test_protocol: args.testProtocol,
    p_raw_result: args.rawResult,
    p_client_age: args.clientAge,
    p_client_gender: args.clientGender,
    p_population: args.population ?? 'general',
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    domainScore: row?.domain_score ?? null,
    scoreStatus: (row?.score_status ?? 'age_out_of_range') as ScoreStatus,
    matchedTableId: row?.matched_table_id ?? null,
  };
}

// Two-part domains (Strength: chair stand + arm curl; Flexibility:
// sit-and-reach + back scratch) call the RPC twice — once per sub-test
// protocol — and average the two resulting scores. If either sub-test comes
// back age_out_of_range, the averaged result is also age_out_of_range/null —
// never average a real score with a missing one.
export async function calculateTwoPartDomainScore(args: {
  domain: FitnessDomain;
  testProtocolPrimary: string;
  rawResultPrimary: number;
  testProtocolSecondary: string;
  rawResultSecondary: number;
  clientAge: number;
  clientGender: 'male' | 'female';
  population?: 'general' | 'athlete';
}): Promise<{ domainScore: number | null; scoreStatus: ScoreStatus }> {
  const [primary, secondary] = await Promise.all([
    calculateDomainScore({
      domain: args.domain,
      testProtocol: args.testProtocolPrimary,
      rawResult: args.rawResultPrimary,
      clientAge: args.clientAge,
      clientGender: args.clientGender,
      population: args.population,
    }),
    calculateDomainScore({
      domain: args.domain,
      testProtocol: args.testProtocolSecondary,
      rawResult: args.rawResultSecondary,
      clientAge: args.clientAge,
      clientGender: args.clientGender,
      population: args.population,
    }),
  ]);

  if (primary.scoreStatus !== 'scored' || secondary.scoreStatus !== 'scored' || primary.domainScore == null || secondary.domainScore == null) {
    return { domainScore: null, scoreStatus: 'age_out_of_range' };
  }

  return { domainScore: (primary.domainScore + secondary.domainScore) / 2, scoreStatus: 'scored' };
}

// ── Queries ──────────────────────────────────────────────────────────────────
// All of a client's assessments, most recent first, each with its domain
// results joined — used by both the client trend view and the coach/admin
// full-history tab.
export function useClientFitnessAssessments(clientId: string) {
  return useQuery({
    queryKey: fitnessKeys.clientAssessments(clientId),
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fitness_assessments')
        .select('*, results:fitness_domain_results(*)')
        .eq('client_id', clientId)
        .order('assessment_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as (FitnessAssessment & { results: FitnessDomainResult[] })[];
    },
  });
}

// Convenience for the client's own assessments (uses their own auth id).
export function useMyFitnessAssessments() {
  const { user } = useAuth();
  const query = useClientFitnessAssessments(user?.id ?? '');
  return query;
}

// ── Mutations ────────────────────────────────────────────────────────────────
export interface SubmitFitnessAssessmentInput {
  clientId: string;
  coachId: string;
  assessmentDate: string; // YYYY-MM-DD
  clientAge: number;
  clientGender: 'male' | 'female';
  isAthlete: boolean | null;
  notes?: string | null;
  domains: {
    strength?: { chairStandReps: number; armCurlReps: number };
    flexibility?: { sitAndReachInches: number; backScratchInches: number };
    endurance?: { protocol: EnduranceProtocol; value: number };
    agility?: { upAndGoSeconds: number };
  };
}

export function useSubmitFitnessAssessment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitFitnessAssessmentInput) => {
      const { data: assessment, error: assessmentErr } = await supabase
        .from('fitness_assessments')
        .insert({
          client_id: input.clientId,
          coach_id: input.coachId,
          assessment_date: input.assessmentDate,
          client_age_at_assessment: input.clientAge,
          client_gender: input.clientGender,
          is_athlete: input.isAthlete,
          notes: input.notes ?? null,
        })
        .select('id')
        .single();
      if (assessmentErr) throw assessmentErr;

      const assessmentId = assessment.id as string;
      const rows: Omit<FitnessDomainResult, 'id' | 'created_at' | 'assessment_id'>[] = [];

      if (input.domains.strength) {
        const { chairStandReps, armCurlReps } = input.domains.strength;
        const { domainScore, scoreStatus } = await calculateTwoPartDomainScore({
          domain: 'strength',
          testProtocolPrimary: 'Chair Stand',
          rawResultPrimary: chairStandReps,
          testProtocolSecondary: 'Arm Curl',
          rawResultSecondary: armCurlReps,
          clientAge: input.clientAge,
          clientGender: input.clientGender,
        });
        rows.push({
          domain: 'strength',
          raw_result_primary: chairStandReps,
          raw_result_secondary: armCurlReps,
          raw_result_unit: 'reps',
          test_protocol_used: 'Chair Stand + Arm Curl',
          domain_score: domainScore,
          score_status: scoreStatus,
          evidence_strength: 'strong',
        });
      }

      if (input.domains.flexibility) {
        const { sitAndReachInches, backScratchInches } = input.domains.flexibility;
        const { domainScore, scoreStatus } = await calculateTwoPartDomainScore({
          domain: 'flexibility',
          testProtocolPrimary: 'Chair Sit-and-Reach',
          rawResultPrimary: sitAndReachInches,
          testProtocolSecondary: 'Back Scratch',
          rawResultSecondary: backScratchInches,
          clientAge: input.clientAge,
          clientGender: input.clientGender,
        });
        rows.push({
          domain: 'flexibility',
          raw_result_primary: sitAndReachInches,
          raw_result_secondary: backScratchInches,
          raw_result_unit: 'inches',
          test_protocol_used: 'Chair Sit-and-Reach + Back Scratch',
          domain_score: domainScore,
          score_status: scoreStatus,
          evidence_strength: 'strong',
        });
      }

      if (input.domains.endurance) {
        const { protocol, value } = input.domains.endurance;
        const { domainScore, scoreStatus } = await calculateDomainScore({
          domain: 'endurance',
          testProtocol: protocol,
          rawResult: value,
          clientAge: input.clientAge,
          clientGender: input.clientGender,
        });
        rows.push({
          domain: 'endurance',
          raw_result_primary: value,
          raw_result_secondary: null,
          raw_result_unit: protocol === '6-Minute Walk' ? 'yards' : 'steps',
          test_protocol_used: protocol,
          domain_score: domainScore,
          score_status: scoreStatus,
          evidence_strength: 'strong',
        });
      }

      if (input.domains.agility) {
        const { upAndGoSeconds } = input.domains.agility;
        const { domainScore, scoreStatus } = await calculateDomainScore({
          domain: 'agility',
          testProtocol: '8-Foot Up-and-Go',
          rawResult: upAndGoSeconds,
          clientAge: input.clientAge,
          clientGender: input.clientGender,
        });
        rows.push({
          domain: 'agility',
          raw_result_primary: upAndGoSeconds,
          raw_result_secondary: null,
          raw_result_unit: 'seconds',
          test_protocol_used: '8-Foot Up-and-Go',
          domain_score: domainScore,
          score_status: scoreStatus,
          evidence_strength: 'moderate',
        });
      }

      if (rows.length > 0) {
        const { error: resultsErr } = await supabase
          .from('fitness_domain_results')
          .insert(rows.map((r) => ({ ...r, assessment_id: assessmentId })));
        if (resultsErr) throw resultsErr;
      }

      return { assessmentId };
    },
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: fitnessKeys.clientAssessments(input.clientId) });
    },
  });
}
