import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { Grant, ProposalSections } from '../api/types';

const SAVED_KEY = 'voidcat.saved_grants.v1';
const PROPOSALS_KEY = 'voidcat.proposals.v1';

export interface SavedGrant {
  grant: Grant;
  savedAt: string;
}

export interface StoredProposal {
  grantId: string;
  grantTitle: string;
  proposal: ProposalSections;
  executionType: string;
  generatedAt: string;
}

interface LibraryValue {
  ready: boolean;
  saved: SavedGrant[];
  proposals: StoredProposal[];
  isSaved: (id: string) => boolean;
  toggleSaved: (grant: Grant) => void;
  removeSaved: (id: string) => void;
  storeProposal: (entry: StoredProposal) => void;
  proposalFor: (grantId: string) => StoredProposal | undefined;
  /** Remembers search results so grant screens can resolve a grant by id. */
  cacheGrants: (grants: Grant[]) => void;
  findGrant: (id: string) => Grant | undefined;
}

const LibraryContext = createContext<LibraryValue | null>(null);

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<SavedGrant[]>([]);
  const [proposals, setProposals] = useState<StoredProposal[]>([]);

  // Search results only need to survive navigation, not app restarts.
  const searchCache = useRef<Map<string, Grant>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedSaved, storedProposals] = await Promise.all([
        readJson<SavedGrant[]>(SAVED_KEY, []),
        readJson<StoredProposal[]>(PROPOSALS_KEY, []),
      ]);
      if (cancelled) return;
      setSaved(storedSaved);
      setProposals(storedProposals);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Writes are fire-and-forget: state is the source of truth for the UI, and a
  // failed write only costs the user this change on next launch.
  useEffect(() => {
    if (ready) void AsyncStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  }, [saved, ready]);

  useEffect(() => {
    if (ready) void AsyncStorage.setItem(PROPOSALS_KEY, JSON.stringify(proposals));
  }, [proposals, ready]);

  const isSaved = useCallback((id: string) => saved.some((s) => s.grant.id === id), [saved]);

  const toggleSaved = useCallback((grant: Grant) => {
    setSaved((current) =>
      current.some((s) => s.grant.id === grant.id)
        ? current.filter((s) => s.grant.id !== grant.id)
        : [{ grant, savedAt: new Date().toISOString() }, ...current],
    );
  }, []);

  const removeSaved = useCallback((id: string) => {
    setSaved((current) => current.filter((s) => s.grant.id !== id));
  }, []);

  const storeProposal = useCallback((entry: StoredProposal) => {
    setProposals((current) => [entry, ...current.filter((p) => p.grantId !== entry.grantId)]);
  }, []);

  const proposalFor = useCallback(
    (grantId: string) => proposals.find((p) => p.grantId === grantId),
    [proposals],
  );

  const cacheGrants = useCallback((grants: Grant[]) => {
    for (const grant of grants) searchCache.current.set(grant.id, grant);
  }, []);

  const findGrant = useCallback(
    (id: string) => searchCache.current.get(id) ?? saved.find((s) => s.grant.id === id)?.grant,
    [saved],
  );

  const value = useMemo<LibraryValue>(
    () => ({
      ready,
      saved,
      proposals,
      isSaved,
      toggleSaved,
      removeSaved,
      storeProposal,
      proposalFor,
      cacheGrants,
      findGrant,
    }),
    [
      ready,
      saved,
      proposals,
      isSaved,
      toggleSaved,
      removeSaved,
      storeProposal,
      proposalFor,
      cacheGrants,
      findGrant,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error('useLibrary must be used inside LibraryProvider');
  return value;
}
