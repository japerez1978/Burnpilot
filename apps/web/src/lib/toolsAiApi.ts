import type {
  ToolsAiCategorySnapshot,
  ToolsAiEnrichBody,
  ToolsAiEnrichData,
  ToolsAiSuggestBody,
  ToolsAiSuggestData,
} from '@burnpilot/types';

const ENRICH_PATH = '/v1/tools/ai-enrich';
const SUGGEST_PATH = '/v1/tools/ai-suggest';

type ToolsAiErrJson = { ok?: boolean; error?: string; code?: string };

function toolsAiUserError(res: Response, json: ToolsAiErrJson): Error {
  const raw = json.error ?? `Error (${res.status})`;
  if (json.code === 'NOT_CONFIGURED' || raw.includes('ANTHROPIC_API_KEY')) {
    return new Error(
      'IA no configurada en el servidor: añade ANTHROPIC_API_KEY en Railway (Variables del servicio API), redeploy, y vuelve a intentar. No se configura en Netlify.',
    );
  }
  return new Error(raw);
}

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
  const json = (await res.json()) as ToolsAiErrJson & { data?: ToolsAiEnrichData };
  if (!res.ok || !json.ok || !json.data) {
    throw toolsAiUserError(res, json);
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
  const json = (await res.json()) as ToolsAiErrJson & { data?: ToolsAiSuggestResponse };
  if (!res.ok || !json.ok || !json.data) {
    throw toolsAiUserError(res, json);
  }
  return json.data;
}

export type { ToolsAiCategorySnapshot, ToolsAiEnrichBody, ToolsAiSuggestBody };
