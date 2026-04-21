import type { StackosAgentAction, StackosAgentClientBodyInput } from '@burnpilot/types';

const ANALYZE_PATH = '/v1/stackos/analyze';
const AGENT_PATH = '/v1/stackos/agent';

export type StackosAnalyzeBody = {
  name: string;
  description: string;
  facilidad: number;
  velocidad: number;
  eficiencia: number;
  einicial: number;
  elifetime: number;
};

export type StackosAnalyzeResult = {
  facilidad: number;
  velocidad: number;
  eficiencia: number;
  einicial: number;
  elifetime: number;
  why: string;
  how: string;
  tech: string[];
  aiNote: string;
};

export async function fetchStackosAnalyze(
  apiBase: string,
  accessToken: string,
  body: StackosAnalyzeBody,
): Promise<StackosAnalyzeResult> {
  const url = `${apiBase.replace(/\/$/, '')}${ANALYZE_PATH}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok?: boolean; data?: StackosAnalyzeResult; error?: string; code?: string };
  if (!res.ok || !json.ok || !json.data) {
    throw new Error(json.error ?? `Analyze failed (${res.status})`);
  }
  return json.data;
}

/** Respuesta del agente externo (normalizada por la API). */
export type StackosAgentResult = unknown;

export async function fetchStackosAgent(
  apiBase: string,
  accessToken: string,
  body: StackosAgentClientBodyInput,
): Promise<StackosAgentResult> {
  const url = `${apiBase.replace(/\/$/, '')}${AGENT_PATH}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    data?: StackosAgentResult;
    error?: string;
    code?: string;
  };
  if (!res.ok || !json.ok || json.data === undefined) {
    throw new Error(json.error ?? `Agent failed (${res.status})`);
  }
  return json.data;
}

export type { StackosAgentAction, StackosAgentClientBodyInput };
