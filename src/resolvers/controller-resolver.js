import Resolver from '@forge/resolver';
import { kvs } from '@forge/kvs';
import { controllerQueue, workerQueue } from './queues';
import {
  buildImportStateKey,
  buildJobsStorageKey,
  markImportCompleted,
} from './assets-import-utils';

const resolver = new Resolver();

const COMPLETION_CHECK_DELAY_SECONDS = 5;

async function areAllWorkerJobsComplete(importId) {
  const jobIds = (await kvs.get(buildJobsStorageKey(importId))) || [];

  if (jobIds.length === 0) {
    return false;
  }

  for (const jobId of jobIds) {
    const jobProgress = workerQueue.getJob(jobId);
    const { inProgress, failed } = await jobProgress.getStats();

    if (failed) {
      throw new Error(`Worker job ${jobId} failed during import ${importId}`);
    }

    if (inProgress) {
      return false;
    }
  }

  return true;
}

resolver.define('controller-queue-listener', async ({ payload }) => {
  const { phase, workspaceId, importId, executionId } = payload;

  if (phase === 'start') {
    console.log(`Controller starting import ${importId}, execution ${executionId}`);

    await kvs.set(buildJobsStorageKey(importId), []);
    await kvs.set(buildImportStateKey(importId), {
      status: 'IN_PROGRESS',
      executionId,
      startedAt: new Date().toISOString(),
    });

    await workerQueue.push({
      body: {
        workspaceId,
        importId,
        executionId,
        offset: 0,
      },
    });

    return;
  }

  if (phase === 'check-completion') {
    console.log(`Controller checking completion for import ${importId}`);

    const allComplete = await areAllWorkerJobsComplete(importId);

    if (!allComplete) {
      await controllerQueue.push({
        body: {
          phase: 'check-completion',
          workspaceId,
          importId,
          executionId,
        },
        delayInSeconds: COMPLETION_CHECK_DELAY_SECONDS,
      });
      return;
    }

    console.log(`All worker jobs complete for import ${importId}, marking as completed`);
    await markImportCompleted(workspaceId, importId, executionId);

    await kvs.set(buildImportStateKey(importId), {
      status: 'COMPLETED',
      executionId,
      completedAt: new Date().toISOString(),
    });

    console.log(`Import ${importId} completed successfully`);
  }
});

export const controllerQueueHandler = resolver.getDefinitions();
