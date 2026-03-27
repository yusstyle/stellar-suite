import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface UserSettingsState {
  theme: Theme;
  fontSize: number;
  formatOnSave: boolean;
  setTheme: (theme: Theme) => void;
  setFontSize: (fontSize: number) => void;
  setFormatOnSave: (formatOnSave: boolean) => void;
}

export const useUserSettingsStore = create<UserSettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      fontSize: 14,
      formatOnSave: true,
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFormatOnSave: (formatOnSave) => set({ formatOnSave }),
    }),
    {
      name: 'user-settings',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? window.localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
    }
  )
);
