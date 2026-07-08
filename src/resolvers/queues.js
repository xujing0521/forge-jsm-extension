import { Queue } from '@forge/events';

// Controller 队列：编排导入流程
export const controllerQueue = new Queue({ key: 'controller-queue' });

// Worker 队列：分批拉取数据并提交到 Assets
export const workerQueue = new Queue({ key: 'worker-queue' });
