import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('../../api/client', () => ({
  api: { search: vi.fn() },
}));

import { useSearch } from '../useSearch';
import { api } from '../../api/client';
import searchReducer from '../../store/slices/searchSlice';

const makeRoom = (id: string) => ({
  roomId: id,
  name: `Room ${id}`,
  capacity: 2,
  features: [] as string[],
  timezone: 'UTC',
  status: 'AVAILABLE',
});

const makeResponse = (results: ReturnType<typeof makeRoom>[], total: number, page = 1) => ({
  results,
  total,
  page,
  limit: 50,
});

// Each test gets a fresh store to prevent state bleeding between tests.
function createWrapper() {
  const store = configureStore({ reducer: { search: searchReducer } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
  return Wrapper;
}

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('setParam updates params', () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    act(() => result.current.setParam('capacity', 8));
    expect(result.current.params.capacity).toBe(8);
  });

  it('search(1) replaces results', async () => {
    vi.mocked(api.search).mockResolvedValueOnce(makeResponse([makeRoom('r1'), makeRoom('r2')], 2));
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    await act(() => result.current.search(1));
    expect(result.current.results).toHaveLength(2);

    vi.mocked(api.search).mockResolvedValueOnce(makeResponse([makeRoom('r3')], 1));
    await act(() => result.current.search(1));
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].roomId).toBe('r3');
  });

  it('search(2) accumulates results', async () => {
    const page1 = [makeRoom('r1'), makeRoom('r2')];
    vi.mocked(api.search).mockResolvedValueOnce(makeResponse(page1, 100));
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    await act(() => result.current.search(1));

    const page2 = [makeRoom('r3')];
    vi.mocked(api.search).mockResolvedValueOnce(makeResponse(page2, 100, 2));
    await act(() => result.current.search(2));
    expect(result.current.results).toHaveLength(3);
  });

  it('hasMore is true when results.length * page < total', async () => {
    const rooms = Array.from({ length: 50 }, (_, i) => makeRoom(`r${i}`));
    vi.mocked(api.search).mockResolvedValueOnce(makeResponse(rooms, 100));
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    await act(() => result.current.search(1));
    expect(result.current.hasMore).toBe(true);
  });

  it('loadMore is a no-op when hasMore=false', async () => {
    vi.mocked(api.search).mockResolvedValueOnce(makeResponse([makeRoom('r1')], 1));
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    await act(() => result.current.search(1));
    expect(result.current.hasMore).toBe(false);

    vi.clearAllMocks();
    act(() => result.current.loadMore());
    expect(api.search).not.toHaveBeenCalled();
  });

  it('loading is true during fetch, false after', async () => {
    let resolve!: (v: ReturnType<typeof makeResponse>) => void;
    vi.mocked(api.search).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });

    act(() => {
      result.current.search(1);
    });
    expect(result.current.loading).toBe(true);

    act(() => resolve(makeResponse([], 0)));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
