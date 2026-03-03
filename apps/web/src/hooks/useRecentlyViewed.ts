import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addRoom, clearAll, selectRecentlyViewed } from '../store/slices/recentlyViewedSlice';
import type { RecentlyViewedRoom } from '../store/slices/recentlyViewedSlice';

// Re-export so callers don't need to import from the slice directly
export type { RecentlyViewedRoom };

export function useRecentlyViewed() {
  const dispatch = useAppDispatch();
  const rooms = useAppSelector(selectRecentlyViewed);

  const addRoomFn = useCallback(
    (room: RecentlyViewedRoom) => {
      dispatch(addRoom(room));
    },
    [dispatch],
  );

  const clearAllFn = useCallback(() => {
    dispatch(clearAll());
  }, [dispatch]);

  return { rooms, addRoom: addRoomFn, clearAll: clearAllFn };
}
