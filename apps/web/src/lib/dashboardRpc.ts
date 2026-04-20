/** Respuestas JSON de public.dashboard_summary() / project_summary() / savings_plan() (Sprint 3–4). */

export type DashboardAlert = {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
};

export type DashboardCategoryRow = {
  category_id: number;
  name: string;
  color: string;
  monthly_base_cents: number;
};

export type DashboardToolRow = {
  tool_id: string;
  name: string;
  monthly_base_cents: number;
};

export type DashboardProjectKpiRow = {
  project_id: string;
  name: string;
  monthly_base_cents: number;
};

export type DashboardRenewalRow = {
  tool_id: string;
  name: string;
  next_renewal_date: string;
};

/** Puntos mensuales de `dashboard_history` (Sprint 6). */
export type DashboardHistoryPoint = {
  month: string;
  total_base_cents: number;
};

export type DashboardSummary = {
  display_currency: string;
  monthly_budget_cents: number | null;
  monthly_burn_base_cents: number;
  yearly_burn_base_cents: number;
  category_breakdown: DashboardCategoryRow[];
  top_tools: DashboardToolRow[];
  project_kpis: DashboardProjectKpiRow[];
  renewals_next_7d: DashboardRenewalRow[];
  alerts: DashboardAlert[];
};

export type SavingsCandidate = {
  tool_id: string;
  name: string;
  monthly_base_cents: number;
  reason: string;
};

export type SavingsPlan = {
  potential_monthly_savings_cents: number;
  candidates: SavingsCandidate[];
};

/** Sprint 6 — Recommended Stacks */
export type RecommendedStackItemRow = {
  label: string;
  sort_order: number;
};

export type RecommendedStackRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthly_estimate_cents: number;
  last_reviewed_at: string | null;
  sort_order: number;
  recommended_stack_items?: RecommendedStackItemRow[];
};

export type StackComparisonRow = {
  item_label: string;
  matched: boolean;
  matched_tool_name: string | null;
};

export type StackComparisonResult = {
  stack: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    monthly_estimate_cents: number;
    last_reviewed_at: string | null;
  };
  project_monthly_cents: number;
  rows: StackComparisonRow[];
};

export type ProjectSummary = {
  project_id: string;
  name: string;
  description: string | null;
  monthly_burn_base_cents: number;
  yearly_burn_base_cents: number;
  tools: Array<{
    tool_id: string;
    name: string;
    monthly_base_cents: number;
    allocation_pct: number;
  }>;
  alerts: DashboardAlert[];
};
