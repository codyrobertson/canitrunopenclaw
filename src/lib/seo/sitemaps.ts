import {
  getBestCountCached,
  getCanCountCached,
  getCompareCountCached,
  getDeviceCountCached,
  getForkCountCached,
  getGuidesCountCached,
} from "@/lib/queries-cached";

export const SITEMAP_CHUNK_SIZE = 45_000;

function chunkCount(total: number): number {
  return Math.max(1, Math.ceil(total / SITEMAP_CHUNK_SIZE));
}

export async function generateSitemapChunkIds(): Promise<{ id: number }[]> {
  const deviceCount = await getDeviceCountCached();
  const forkCount = await getForkCountCached();
  const canCount = await getCanCountCached();
  const bestCount = await getBestCountCached();
  const compareCount = await getCompareCountCached();
  const guidesCount = await getGuidesCountCached();

  const ids: { id: number }[] = [{ id: 0 }]; // static

  for (let i = 0; i < chunkCount(deviceCount); i++) ids.push({ id: 1000 + i });
  for (let i = 0; i < chunkCount(forkCount); i++) ids.push({ id: 2000 + i });
  for (let i = 0; i < chunkCount(canCount); i++) ids.push({ id: 3000 + i });
  for (let i = 0; i < chunkCount(bestCount); i++) ids.push({ id: 4000 + i });
  for (let i = 0; i < chunkCount(compareCount); i++) ids.push({ id: 5000 + i });
  for (let i = 0; i < chunkCount(guidesCount); i++) ids.push({ id: 6000 + i });

  return ids;
}
