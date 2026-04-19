import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

type SessionState = {
  session: Session | null;
  initialized: boolean;
  setAuth: (session: Session | null) => void;
  markInitialized: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  initialized: false,
  setAuth: (session) => set({ session, initialized: true }),
  markInitialized: () => set({ initialized: true }),
}));
