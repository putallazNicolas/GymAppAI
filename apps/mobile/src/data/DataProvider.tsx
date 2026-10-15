import { createDomainServices, type DomainServices, type Repositories } from '@gym/core';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

interface DataContextValue {
  repositories: Repositories;
  services: DomainServices;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({
  repositories,
  children,
}: {
  repositories: Repositories;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ repositories, services: createDomainServices(repositories) }),
    [repositories],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('Data hooks must be used inside <DataProvider>');
  return ctx;
}

export function useRepositories(): Repositories {
  return useData().repositories;
}

export function useServices(): DomainServices {
  return useData().services;
}
