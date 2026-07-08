import Resolver from '@forge/resolver';
import { kvs } from '@forge/kvs';
import { controllerQueue } from './queues';
import {
  buildConfigStorageKey,
  buildImportStateKey,
  buildJobsStorageKey,
  createImportExecution,
  submitMapping,
} from './assets-import-utils';

const resolver = new Resolver();

resolver.define('getText', () => {
  return 'JSM Assets Import is ready.';
});

/**
 * 保存导入配置：提交 mapping 到 Assets 并持久化配置状态。
 * 前端在「Save configuration」时调用。
 */
resolver.define('saveConfiguration', async (req) => {
  const { workspaceId, importId } = req.payload;
  const { description } = req.payload;

  if (!workspaceId || !importId) {
    throw new Error('workspaceId and importId are required');
  }

  await submitMapping(workspaceId, importId);

  const config = {
    configured: true,
    description: description || 'Forge Assets Import Demo',
    configuredAt: new Date().toISOString(),
  };

  await kvs.set(buildConfigStorageKey(importId), config);

  return {
    success: true,
    message: 'Configuration saved and mapping submitted successfully',
    config,
  };
});

/**
 * 读取已保存的导入配置。
 */
resolver.define('getConfiguration', async (req) => {
  const { importId } = req.payload;

  if (!importId) {
    throw new Error('importId is required');
  }

  const config = await kvs.get(buildConfigStorageKey(importId));
  return config || { configured: false };
});

export const handler = resolver.getDefinitions();

/**
 * 删除导入配置时清理 Storage 中的相关数据。
 */
export const onDeleteImport = async (context) => {
  const { importId } = context;
  console.log(`Import ${importId} deleted, cleaning up storage`);

  await Promise.all([
    kvs.delete(buildConfigStorageKey(importId)),
    kvs.delete(buildImportStateKey(importId)),
    kvs.delete(buildJobsStorageKey(importId)),
  ]);

  return {
    result: 'on delete import',
  };
};

/**
 * 用户点击「Import data」时触发。
 * 创建 execution 并推送 controller 队列开始数据摄取。
 */
export const startImport = async (context) => {
  const { importId, workspaceId } = context;
  console.log(`Import ${importId} started`);

  const config = await kvs.get(buildConfigStorageKey(importId));
  if (!config?.configured) {
    throw new Error('Import is not configured. Please save configuration first.');
  }

  const executionId = await createImportExecution(workspaceId, importId);
  console.log(`Created execution ${executionId} for import ${importId}`);

  const { jobId } = await controllerQueue.push({
    body: {
      phase: 'start',
      workspaceId,
      importId,
      executionId,
    },
  });

  console.log(`Pushed controller event with jobId ${jobId}`);

  return {
    result: 'start import',
    executionId,
  };
};

/**
 * 用户取消导入时触发。
 * 更新状态为已停止（演示实现，生产环境可补充取消队列 job 的逻辑）。
 */
export const stopImport = async (context) => {
  const { importId } = context;
  console.log(`Import ${importId} stopped`);

  await kvs.set(buildImportStateKey(importId), {
    status: 'STOPPED',
    stoppedAt: new Date().toISOString(),
  });

  return {
    result: 'stop import',
  };
};

/**
 * Imports UI 加载时调用，决定显示 NOT CONFIGURED 还是可点击的 Import data 按钮。
 * 返回 NOT_CONFIGURED 或 READY。
 */
export const importStatus = async (context) => {
  const { importId } = context;
  const config = await kvs.get(buildConfigStorageKey(importId));

  const status = config?.configured ? 'READY' : 'NOT_CONFIGURED';
  console.log(`Import ${importId} status: ${status}`);

  return { status };
};
