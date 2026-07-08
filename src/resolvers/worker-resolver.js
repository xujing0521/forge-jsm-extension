import Resolver from '@forge/resolver';
import { kvs } from '@forge/kvs';
import { controllerQueue, workerQueue } from './queues';
import {
  buildJobsStorageKey,
  fetchDeviceBatch,
  submitDataChunk,
  transformDevicesForAssets,
} from './assets-import-utils';

const resolver = new Resolver();

/**
 * 将 worker jobId 记录到 Storage，供 controller 检查是否全部完成。
 */
async function trackWorkerJob(importId, jobId) {
  const storageKey = buildJobsStorageKey(importId);
  const existingJobs = (await kvs.get(storageKey)) || [];
  await kvs.set(storageKey, existingJobs.concat(jobId));
}

resolver.define('worker-queue-listener', async ({ payload, context }) => {
  const { workspaceId, importId, executionId, offset } = payload;

  console.log(`Worker processing batch at offset ${offset} for import ${importId}`);

  await trackWorkerJob(importId, context.jobId);

  const { items, hasMore, nextOffset } = fetchDeviceBatch(offset);
  const transformedData = transformDevicesForAssets(items);

  await submitDataChunk(workspaceId, importId, executionId, transformedData);

  console.log(`Submitted ${items.length} devices at offset ${offset}`);

  if (hasMore) {
    await workerQueue.push({
      body: {
        workspaceId,
        importId,
        executionId,
        offset: nextOffset,
      },
    });
  } else {
    console.log(`All data submitted for import ${importId}, notifying controller`);
    await controllerQueue.push({
      body: {
        phase: 'check-completion',
        workspaceId,
        importId,
        executionId,
      },
    });
  }
});

export const workerQueueHandler = resolver.getDefinitions();
