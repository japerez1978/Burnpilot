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
