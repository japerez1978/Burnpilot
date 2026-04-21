import type {
  ToolsAiCategorySnapshot,
  ToolsAiEnrichBody,
  ToolsAiEnrichData,
  ToolsAiSuggestBody,
  ToolsAiSuggestData,
} from '@burnpilot/types';

const ENRICH_PATH = '/v1/tools/ai-enrich';
const SUGGEST_PATH = '/v1/tools/ai-suggest';

export async function fetchToolsAiEnrich(
  apiBase: string,
  accessToken: string,
  body: ToolsAiEnrichBody,
): Promise<ToolsAiEnrichData> {
  const url = `${apiBase.replace(/\/$/, '')}${ENRICH_PATH}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok?: boolean; data?: ToolsAiEnrichData; error?: string };
  if (!res.ok || !json.ok || !json.data) {
    throw new Error(json.error ?? `Enrich failed (${res.status})`);
  }
  return json.data;
}

export type ToolsAiSuggestResponse = Pick<ToolsAiSuggestData, 'disclaimer'> & {
  suggestions: ToolsAiSuggestData['suggestions'];
};

export async function fetchToolsAiSuggest(
  apiBase: string,
  accessToken: string,
  body: ToolsAiSuggestBody,
): Promise<ToolsAiSuggestResponse> {
  const url = `${apiBase.replace(/\/$/, '')}${SUGGEST_PATH}`;
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
    data?: ToolsAiSuggestResponse;
    error?: string;
  };
  if (!res.ok || !json.ok || !json.data) {
    throw new Error(json.error ?? `Suggest failed (${res.status})`);
  }
  return json.data;
}

export type { ToolsAiCategorySnapshot, ToolsAiEnrichBody, ToolsAiSuggestBody };
