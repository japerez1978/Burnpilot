# Traspaso entre chats (agentes / Cursor)

## Regla de contexto (~90 % o aviso de límite)

El modelo **no tiene un contador exacto de tokens visible** en todos los clientes. Se aplica esta regla cuando:

- El **producto** avisa de límite de contexto / conversación larga, **o**
- El **usuario** dice que el chat llega al límite o pide traspaso, **o**
- La conversación acumula **muchos turnos** sin compactar y el hilo se vuelve difícil de seguir.

**Entonces el asistente debe:**

1. Emitir un **resumen de traspaso** usando la plantilla de abajo (en el chat y, si aplica, actualizando [`docs/handoff/LATEST.md`](handoff/LATEST.md)).
2. **Avisar explícitamente** al usuario: *“Abre un chat nuevo y pega este resumen (o lee `docs/handoff/LATEST.md`) + pide leer `docs/STATUS.md` y `AGENTS.md`.”*
3. **No** prometer medición exacta del “90 %”; sí actuar **de forma conservadora** ante señales de límite.

## Plantilla de resumen (copiar / pegar en el chat nuevo)

```text
Continúo BurnPilot. Lee en orden:
1) docs/handoff/LATEST.md (snapshot de esta sesión)
2) docs/STATUS.md (estado sprint / política de mantenimiento)
3) AGENTS.md (especificación P1–P14)

[PEGA AQUÍ el cuerpo del resumen: producto, stack, hecho, siguiente, bloqueos, rutas, secretos NO]
```

## Mantenimiento de `docs/handoff/LATEST.md`

- Actualizar **solo** al hacer traspaso o cierre de fase importante (no en cada mensaje).
- **Nunca** incluir API keys, `.env`, ni secretos.

## Documentos relacionados

- [STATUS.md](STATUS.md) — sprint actual y política de cuándo tocar STATUS vs README.
- [AGENTS.md](../AGENTS.md) — especificación del proyecto.
