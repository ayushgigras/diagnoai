import { create } from 'zustand';

interface ChatStore {
    context: string | null;
    setContext: (context: string | null) => void;
}

const useChatStore = create<ChatStore>((set) => ({
    context: null,
    setContext: (context) => set({ context }),
}));

export default useChatStore;
