import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useRecentlyViewed, type RecentlyViewedRoom } from '../useRecentlyViewed';
import recentlyViewedReducer from '../../store/slices/recentlyViewedSlice';

const LS_KEY = 'rb_recently_viewed';

const makeRoom = (id: string): RecentlyViewedRoom => ({
  roomId: id,
  name: `Room ${id}`,
  capacity: 4,
  features: [],
});

// Provide a reliable in-memory localStorage stub — jsdom's localStorage can
// throw a SecurityError in some environments depending on the document URL.
let _store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => _store[key] ?? null,
  setItem: (key: string, value: string) => {
    _store[key] = value;
  },
  removeItem: (key: string) => {
    delete _store[key];
  },
  clear: () => {
    _store = {};
  },
  get length() {
    return Object.keys(_store).length;
  },
  key: (i: number) => Object.keys(_store)[i] ?? null,
};

beforeAll(() => {
  vi.stubGlobal('localStorage', localStorageMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  _store = {};
});

// Creates a fresh store + Provider wrapper for each test.
// The recentlyViewedSlice uses a lazy initializer so localStorage is read
// at store-creation time — after _store has been set for the test.
function createWrapper() {
  const store = configureStore({ reducer: { recentlyViewed: recentlyViewedReducer } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  return Wrapper;
}

describe('useRecentlyViewed', () => {
  it('addRoom stores room in localStorage', async () => {
    const { result } = renderHook(() => useRecentlyViewed(), { wrapper: createWrapper() });
    await act(async () => result.current.addRoom(makeRoom('r1')));
    const stored = JSON.parse(localStorageMock.getItem(LS_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].roomId).toBe('r1');
  });

  it('addRoom deduplicates — same roomId moves to front', async () => {
    const { result } = renderHook(() => useRecentlyViewed(), { wrapper: createWrapper() });
    await act(async () => result.current.addRoom(makeRoom('r1')));
    await act(async () => result.current.addRoom(makeRoom('r2')));
    await act(async () => result.current.addRoom(makeRoom('r1')));
    expect(result.current.rooms[0].roomId).toBe('r1');
    expect(result.current.rooms).toHaveLength(2);
  });

  it('max 8 rooms: adding a 9th drops the oldest', async () => {
    const { result } = renderHook(() => useRecentlyViewed(), { wrapper: createWrapper() });
    for (let i = 1; i <= 9; i++) {
      await act(async () => result.current.addRoom(makeRoom(`r${i}`)));
    }
    expect(result.current.rooms).toHaveLength(8);
    expect(result.current.rooms[0].roomId).toBe('r9');
    expect(result.current.rooms.find((r) => r.roomId === 'r1')).toBeUndefined();
  });

  it('clearAll removes all items from localStorage', async () => {
    const { result } = renderHook(() => useRecentlyViewed(), { wrapper: createWrapper() });
    await act(async () => result.current.addRoom(makeRoom('r1')));
    await act(async () => result.current.clearAll());
    expect(result.current.rooms).toHaveLength(0);
    expect(localStorageMock.getItem(LS_KEY)).toBeNull();
  });

  it('initializes from existing localStorage data on mount', async () => {
    const existing = [makeRoom('r1'), makeRoom('r2')];
    _store[LS_KEY] = JSON.stringify(existing);
    // createWrapper() is called AFTER setting _store so the lazy initializer picks it up
    const { result } = renderHook(() => useRecentlyViewed(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.rooms).toHaveLength(2);
      expect(result.current.rooms[0].roomId).toBe('r1');
    });
  });

  it('addRoom persists room data fields to storage', async () => {
    const room: RecentlyViewedRoom = { roomId: 'r1', name: 'Boardroom', capacity: 10, features: ['projector'] };
    const { result } = renderHook(() => useRecentlyViewed(), { wrapper: createWrapper() });
    await act(async () => result.current.addRoom(room));
    const stored = JSON.parse(localStorageMock.getItem(LS_KEY)!)[0];
    expect(stored.name).toBe('Boardroom');
    expect(stored.capacity).toBe(10);
    expect(stored.features).toEqual(['projector']);
  });
});
