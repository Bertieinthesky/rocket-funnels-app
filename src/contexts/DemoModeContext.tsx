import { createContext, useContext, useState, ReactNode } from 'react';

type DemoView = 'admin' | 'team' | 'client';

interface DemoModeContextType {
  isDemoMode: boolean;
  demoView: DemoView;
  toggleDemoMode: () => void;
  setDemoView: (view: DemoView) => void;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoView, setDemoView] = useState<DemoView>('admin');

  const toggleDemoMode = () => {
    setIsDemoMode(prev => !prev);
    if (!isDemoMode) {
      setDemoView('client'); // Default to client view when entering demo mode
    }
  };

  return (
    <DemoModeContext.Provider value={{
      isDemoMode,
      demoView,
      toggleDemoMode,
      setDemoView,
    }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}