import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

export type ApplicationResetContextValue = {
  readonly resetVersion: number;
  readonly requestApplicationReset: () => void;
};

const APPLICATION_RESET_CONTEXT = createContext<ApplicationResetContextValue>({
  resetVersion: 0,
  requestApplicationReset: () => undefined,
});

export function ApplicationResetProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [resetVersion, setResetVersion] = useState(0);

  const requestApplicationReset = useCallback(() => {
    setResetVersion((current) => current + 1);
  }, []);

  const value = useMemo<ApplicationResetContextValue>(
    () => ({
      resetVersion,
      requestApplicationReset,
    }),
    [resetVersion, requestApplicationReset],
  );

  return (
    <APPLICATION_RESET_CONTEXT.Provider value={value}>
      {children}
    </APPLICATION_RESET_CONTEXT.Provider>
  );
}

export function useApplicationReset() {
  return useContext(APPLICATION_RESET_CONTEXT);
}
