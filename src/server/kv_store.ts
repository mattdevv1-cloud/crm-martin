import { kv } from '@vercel/kv';

export const set = async (key: string, value: any): Promise<void> => {
  await kv.set(key, value);
};

export const get = async (key: string): Promise<any> => {
  return await kv.get(key);
};

export const del = async (key: string): Promise<void> => {
  await kv.del(key);
};

export const mset = async (keys: string[], values: any[]): Promise<void> => {
  const pipeline = kv.pipeline();
  keys.forEach((k, i) => pipeline.set(k, values[i]));
  await pipeline.exec();
};

export const mget = async (keys: string[]): Promise<any[]> => {
  const results = await kv.mget(...keys);
  return results as any[];
};

export const mdel = async (keys: string[]): Promise<void> => {
  if (!keys.length) return;
  await kv.del(...keys);
};

export const getByPrefix = async (prefix: string): Promise<any[]> => {
  const keys = await kv.keys(`${prefix}*`);
  if (!keys.length) return [];
  const values = (await kv.mget(...keys)) as any[];
  return values.filter((v) => v !== null);
};


