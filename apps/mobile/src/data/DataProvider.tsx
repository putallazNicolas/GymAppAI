import type { Repositories } from '@gym/core';
import { createContext, useContext, type ReactNode } from 'react';

const RepositoriesContext = createContext<Repositories | null>(null);

export function DataProvider({
  repositories,
  children,
}: {
  repositories: Repositories;
  children: ReactNode;
}) {
  return (
    <RepositoriesContext.Provider value={repositories}>{children}</RepositoriesContext.Provider>
  );
}

export function useRepositories(): Repositories {
  const repos = useContext(RepositoriesContext);
  if (!repos) throw new Error('useRepositories must be used inside <DataProvider>');
  return repos;
}
