import { createContext, ReactNode, useContext } from 'react';
import { FrontendAISettings, useAISettings } from '../hooks/useAISettings';

interface AIContextValue {
  settings: FrontendAISettings | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AIContext = createContext<AIContextValue>({
  settings: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function AIProvider({ children }: { children: ReactNode }) {
  const { settings, loading, error, refresh } = useAISettings();

  return (
    <AIContext.Provider value={{ settings, loading, error, refresh }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAIContext(): AIContextValue {
  return useContext(AIContext);
}


