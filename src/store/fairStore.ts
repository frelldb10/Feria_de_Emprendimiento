import { createPersistentStore } from '../lib/persistentStore';
import { createId } from '../lib/random';
import { createEmptyState, createSeedState } from './seed';
import type { ActivityKind, FairState } from './types';

/*
  Almacén único de la feria. Las acciones leen el estado de forma síncrona con getState(),
  así dos lecturas seguidas del mismo QR nunca ven un estado viejo y el duplicado se bloquea
  aunque el operador escanee dos veces en el mismo instante.

  Los datos viven en localStorage de este navegador. Entre pestañas del mismo equipo se
  sincronizan con el evento "storage"; entre varios celulares hace falta un backend.
*/

const ACTIVITY_LIMIT = 40;

/** Actualiza datos guardados por versiones anteriores para no perder lo registrado. */
function migrate(saved: unknown): FairState | null {
  const data = saved as { version?: number } & Record<string, unknown>;
  if (data.version === 3) return data as unknown as FairState;
  if (data.version === 2) {
    // La versión 2 tenía tres cortes de ventas; ahora son dos y el tercero se descarta.
    const old = data as unknown as Omit<FairState, 'version'> & { sales: Array<FairState['sales'][number] & { cut: number }> };
    return { ...old, version: 3, sales: old.sales.filter((s) => s.cut <= 2) } as FairState;
  }
  // Una versión más vieja o desconocida: se arranca con la demostración.
  return null;
}

const store = createPersistentStore<FairState>('feria-astrea:datos', migrate, createSeedState);

export const getState = store.getState;
export const commit = store.commit;
export const useFairState = store.useState;

export function withActivity(current: FairState, kind: ActivityKind, message: string): FairState {
  const entry = { id: createId('act'), at: new Date().toISOString(), kind, message };
  return { ...current, activity: [entry, ...current.activity].slice(0, ACTIVITY_LIMIT) };
}

export function resetToDemoData(): void {
  commit(createSeedState());
}

export function clearAllData(): void {
  commit(createEmptyState());
}
