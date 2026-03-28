import { create } from "zustand";

interface ErrorHelpState {
  isOpen: boolean;
  errorCode: string | null;
  openErrorHelp: (errorCode: string) => void;
  closeErrorHelp: () => void;
}

export const useErrorHelpStore = create<ErrorHelpState>((set) => ({
  isOpen: false,
  errorCode: null,
  openErrorHelp: (errorCode: string) => set({ isOpen: true, errorCode }),
  closeErrorHelp: () => set({ isOpen: false, errorCode: null }),
}));
