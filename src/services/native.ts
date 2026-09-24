import { NativeModules, Platform } from 'react-native';
import type { PermissionState, Screenshot } from '../types';
type NativeApi = {
  permission(): Promise<PermissionState>;
  requestPermission(): Promise<PermissionState>;
  pick(): Promise<number>;
  list(): Promise<Screenshot[]>;
  recognize(uri: string): Promise<string>;
  hash(uri: string): Promise<string>;
  visualHash(uri: string): Promise<string>;
  setHashes(id: string, hash: string, visualHash: string): Promise<void>;
  permissionPrompted(): Promise<boolean>;
  getTheme(): Promise<string>;
  setTheme(mode: string): Promise<void>;
  setFavorite(id: string, value: boolean): Promise<void>;
  setCategory(id: string, value: string): Promise<void>;
  setIndex(
    id: string,
    text: string,
    category: string,
    hash: string,
    error: string,
  ): Promise<void>;
  delete(uri: string): Promise<boolean>;
  exportData(): Promise<boolean>;
  importData(): Promise<boolean>;
  clearIndex(): Promise<void>;
};
const bridge = NativeModules.SnapSort as NativeApi | undefined;
function api(): NativeApi {
  if (Platform.OS !== 'android' || !bridge)
    throw new Error('SnapSort requires its Android native module');
  return bridge;
}
export const native = {
  permission: () => api().permission(),
  requestPermission: () => api().requestPermission(),
  pick: () => api().pick(),
  list: () => api().list(),
  recognize: (uri: string) => api().recognize(uri),
  hash: (uri: string) => api().hash(uri),
  visualHash: (uri: string) => api().visualHash(uri),
  setHashes: (id: string, hash: string, visualHash: string) =>
    api().setHashes(id, hash, visualHash),
  permissionPrompted: () => api().permissionPrompted(),
  getTheme: () => api().getTheme(),
  setTheme: (mode: string) => api().setTheme(mode),
  setFavorite: (id: string, value: boolean) => api().setFavorite(id, value),
  setCategory: (id: string, value: string) => api().setCategory(id, value),
  setIndex: (
    id: string,
    text: string,
    category: string,
    hash: string,
    error = '',
  ) => api().setIndex(id, text, category, hash, error),
  delete: (uri: string) => api().delete(uri),
  exportData: () => api().exportData(),
  importData: () => api().importData(),
  clearIndex: () => api().clearIndex(),
};
