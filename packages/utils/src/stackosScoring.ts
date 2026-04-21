export type StackosScoringMode = 'launch' | 'retention';

export type StackosIndicators = {
  facilidad: number;
  velocidad: number;
  eficiencia: number;
  einicial: number;
  elifetime: number;
};

/** Pesos alineados con el prototipo Roadmappilot / StackOS v4 (HTML spec). */
export const STACKOS_WEIGHTS: Record<
  StackosScoringMode,
  Record<keyof StackosIndicators, number>
> = {
  launch: {
    einicial: 0.35,
    elifetime: 0.2,
    facilidad: 0.2,
    velocidad: 0.15,
    eficiencia: 0.1,
  },
  retention: {
    einicial: 0.2,
    elifetime: 0.35,
    facilidad: 0.2,
    velocidad: 0.15,
    eficiencia: 0.1,
  },
};

export function calcStackosScore(
  f: StackosIndicators,
  mode: StackosScoringMode,
): number {
  const w = STACKOS_WEIGHTS[mode];
  const raw =
    f.einicial * w.einicial +
    f.elifetime * w.elifetime +
    f.facilidad * w.facilidad +
    f.velocidad * w.velocidad +
    f.eficiencia * w.eficiencia;
  return Math.min(100, Math.max(1, Math.round(raw)));
}

export type StackosMoscow = 'M' | 'S' | 'C' | 'W';

export function calcStackosMoscow(score: number): StackosMoscow {
  if (score >= 75) return 'M';
  if (score >= 55) return 'S';
  if (score >= 35) return 'C';
  return 'W';
}

export function stackosMoscowLabel(m: StackosMoscow): { short: string; full: string } {
  const map: Record<StackosMoscow, { short: string; full: string }> = {
    M: { short: 'MUST', full: 'Must have' },
    S: { short: 'SHOULD', full: 'Should have' },
    C: { short: 'COULD', full: 'Could have' },
    W: { short: "WON'T", full: "Won't have" },
  };
  return map[m];
}

export type StackosWorkflowState = 'active' | 'validated' | 'postponed' | 'archived';

export function stackosWorkflowStateLabel(s: StackosWorkflowState): string {
  const map: Record<StackosWorkflowState, string> = {
    active: 'Activa',
    validated: 'Validada',
    postponed: 'En espera',
    archived: 'Archivada',
  };
  return map[s];
}

/** Payload mínimo para el exportador de prompt (feature del roadmap). */
export type StackosPromptFeature = StackosIndicators & {
  name: string;
  description: string;
  phase: string;
  score: number;
  moscow: StackosMoscow;
  workflow_state: StackosWorkflowState;
  why?: string | null;
  how?: string | null;
  tech?: string[] | null;
  ai_note?: string | null;
};

export function buildStackosExportPrompt(
  f: StackosPromptFeature,
  mode: StackosScoringMode,
): string {
  const w = STACKOS_WEIGHTS[mode];
  const mb = stackosMoscowLabel(f.moscow);
  const stateLabel = stackosWorkflowStateLabel(f.workflow_state);
  const tech = (f.tech ?? []).filter(Boolean);

  return `# ⚠️ ANTES DE ESCRIBIR CUALQUIER LÍNEA DE CÓDIGO — LEE ESTO

## Paso 1 — Lee los documentos de trabajo del proyecto (OBLIGATORIO)

Antes de proponer nada, leer en este orden:

1. \`AGENTS.md\` (raíz del repo)
2. \`docs/agents/AGENTS.md\`
3. \`docs/STATUS.md\`
4. \`docs/burnpilot_plan.md\`
5. \`docs/stackos-spec.md\`
6. \`docs/AGENT_CHAT_HANDOFF.md\` + \`docs/handoff/LATEST.md\`

**Regla crítica:** si hay conflicto entre lo que ves aquí y lo que dicen esos archivos, los archivos del repo mandan.

---

## Paso 2 — Contexto del producto

**Producto:** BurnPilot — SaaS B2C spend optimizer para builders.

---

## Paso 3 — Funcionalidad a construir

**Nombre:** ${f.name}
**Estado en roadmap:** ${stateLabel} · ${f.phase}
**MoSCoW:** ${mb.full} · Score de prioridad: ${f.score}/100

### Qué hace
${f.description}

### Por qué importa
${f.why?.trim() || '—'}

### Cómo construirla
${f.how?.trim() || '—'}

### Tech stack recomendado
${tech.length ? tech.join(', ') : '—'}

${f.ai_note?.trim() ? `### Insight de producto\n${f.ai_note.trim()}\n` : ''}

---

## Paso 4 — Scoring de prioridad (referencia)

| Indicador | Valor | Escala |
|---|---|---|
| Facilidad técnica | ${f.facilidad}/100 | 100 = trivial con IA |
| Velocidad de desarrollo | ${f.velocidad}/100 | 100 = horas con IA |
| Eficiencia de coste (mant.) | ${f.eficiencia}/100 | 100 = coste cero |
| Engagement inicial | ${f.einicial}/100 | 100 = wow primer uso |
| Engagement lifetime | ${f.elifetime}/100 | 100 = uso diario recurrente |

**Fórmula modo ${mode === 'launch' ? 'lanzamiento' : 'retención'}:**
(${f.einicial}×${w.einicial}) + (${f.elifetime}×${w.elifetime}) + (${f.facilidad}×${w.facilidad}) + (${f.velocidad}×${w.velocidad}) + (${f.eficiencia}×${w.eficiencia}) = **${f.score}**

---

## Paso 5 — Instrucciones

1. Sigue AGENTS.md (estructura, RLS, respuestas API \`{ ok, data }\`).
2. Si toca auth, billing o RLS, protocolo P12.
3. Migraciones en \`supabase/migrations/\` con RLS.
4. Tres estados UI: loading / error / vacío.
`;
}
