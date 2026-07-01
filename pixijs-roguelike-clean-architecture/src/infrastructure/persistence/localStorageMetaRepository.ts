import { createDefaultMetaState, IMetaRepository, MetaProgressState } from '../../domain/repositories/metaRepository';

const STORAGE_KEY = 'roguelite_meta_save_v1';

export class LocalStorageMetaRepository implements IMetaRepository {
  load(): MetaProgressState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultMetaState();
      const parsed = JSON.parse(raw) as Partial<MetaProgressState>;
      return { ...createDefaultMetaState(), ...parsed };
    } catch {
      return createDefaultMetaState();
    }
  }

  save(state: MetaProgressState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }

  reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export const metaRepository = new LocalStorageMetaRepository();
