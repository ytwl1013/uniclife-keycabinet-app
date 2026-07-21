import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

import { createMockSelectors, MockSelectors } from './selectors';
import {
  createMockAppService,
  CreateMockAppServiceOptions,
  MockAppActions,
  MockAppService,
} from './service';
import { MockAppState, UserAccount } from './types';

export type MockAppContextValue = {
  state: MockAppState;
  currentUser: UserAccount | null;
  actions: MockAppActions;
  selectors: MockSelectors;
};

const MockAppContext = createContext<MockAppContextValue | null>(null);

export type MockAppProviderProps = PropsWithChildren<{
  service?: MockAppService;
  serviceOptions?: CreateMockAppServiceOptions;
}>;

export function MockAppProvider({
  children,
  service: injectedService,
  serviceOptions,
}: MockAppProviderProps) {
  const serviceRef = useRef<MockAppService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = injectedService ?? createMockAppService(serviceOptions);
  }
  const service = serviceRef.current;
  const state = useSyncExternalStore(service.subscribe, service.getState, service.getState);

  useEffect(() => {
    void service.actions.hydrate();
  }, [service]);

  const selectors = useMemo(() => createMockSelectors(state), [state]);
  const value = useMemo<MockAppContextValue>(
    () => ({
      state,
      currentUser: selectors.currentUser,
      actions: service.actions,
      selectors,
    }),
    [selectors, service.actions, state],
  );

  return <MockAppContext.Provider value={value}>{children}</MockAppContext.Provider>;
}

export function useMockApp(): MockAppContextValue {
  const context = useContext(MockAppContext);
  if (!context) {
    throw new Error('MOCK_APP_PROVIDER_REQUIRED');
  }
  return context;
}
