import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

/**
 * Typed version of `useDispatch` — use this throughout the app instead of
 * the plain `useDispatch` so that async thunks are correctly typed.
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Typed version of `useSelector` — provides full RootState autocompletion
 * and avoids manual type annotations at every call site.
 */
export const useAppSelector = <T>(selector: (state: RootState) => T): T => useSelector(selector);
