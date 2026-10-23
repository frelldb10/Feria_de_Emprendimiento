import { createStore } from '../lib/store';
import { createEmptyState } from './seed';
import type { FairState } from './types';

/*
  Copia en pantalla de los datos de la feria. La fuente de verdad es Supabase: las acciones
  escriben allá y luego actualizan esta copia, y el tiempo real trae lo que hacen los demás
  equipos. No se guarda en el navegador (incluye números de cuenta bancaria).
*/

const store = createStore<FairState>(createEmptyState());

export const getState = store.getState;
export const commit = store.setState;
export const useFairState = store.useState;

export function resetFairState(): void {
  commit(createEmptyState());
}

export type SyncStatus = { phase: 'idle' | 'loading' | 'ready' } | { phase: 'error'; message: string };

const sync = createStore<SyncStatus>({ phase: 'idle' });

export const getSyncStatus = sync.getState;
export const setSyncStatus = sync.setState;
export const useSyncStatus = sync.useState;
