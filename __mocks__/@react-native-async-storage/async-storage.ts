/**
 * In-memory AsyncStorage mock for Jest.
 * Mirrors the full API of @react-native-async-storage/async-storage.
 */
const store: Record<string, string> = {};

const AsyncStorageMock = {
  setItem: jest.fn(async (key: string, value: string) => {
    store[key] = value;
  }),
  getItem: jest.fn(async (key: string) => store[key] ?? null),
  removeItem: jest.fn(async (key: string) => {
    delete store[key];
  }),
  clear: jest.fn(async () => {
    Object.keys(store).forEach((k) => delete store[k]);
  }),
  getAllKeys: jest.fn(async () => Object.keys(store)),
  multiGet: jest.fn(async (keys: string[]) =>
    keys.map((k) => [k, store[k] ?? null])
  ),
  multiSet: jest.fn(async (pairs: [string, string][]) => {
    pairs.forEach(([k, v]) => { store[k] = v; });
  }),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((k) => delete store[k]);
  }),
};

export default AsyncStorageMock;
module.exports = AsyncStorageMock;
module.exports.default = AsyncStorageMock;
