import api, { route } from '@forge/api';

// 每批导入的设备数量，可根据第三方 API 分页大小调整
export const BATCH_SIZE = 5;

/**
 * 演示用的示例设备数据。
 * 实际项目中应替换为从第三方系统 API 拉取的数据。
 */
export const SAMPLE_DEVICES = [
  { id: 'dev-001', name: 'Server Alpha', model: 'Dell R740', status: 'active' },
  { id: 'dev-002', name: 'Server Beta', model: 'HP DL380', status: 'active' },
  { id: 'dev-003', name: 'Switch Core', model: 'Cisco Nexus 9000', status: 'active' },
  { id: 'dev-004', name: 'Firewall Edge', model: 'Palo Alto PA-3220', status: 'maintenance' },
  { id: 'dev-005', name: 'Storage SAN', model: 'NetApp FAS2750', status: 'active' },
  { id: 'dev-006', name: 'Load Balancer', model: 'F5 BIG-IP', status: 'active' },
  { id: 'dev-007', name: 'Backup Server', model: 'Dell R650', status: 'inactive' },
  { id: 'dev-008', name: 'Monitoring Host', model: 'VMware VM', status: 'active' },
  { id: 'dev-009', name: 'Database Node', model: 'AWS RDS', status: 'active' },
  { id: 'dev-010', name: 'Cache Node', model: 'Redis Cluster', status: 'active' },
  { id: 'dev-011', name: 'API Gateway', model: 'Kong Enterprise', status: 'active' },
  { id: 'dev-012', name: 'Log Aggregator', model: 'Elastic Stack', status: 'active' },
];

/**
 * 生成导入配置的 Storage key。
 */
export function buildConfigStorageKey(importId) {
  return `assets-import-config:${importId}`;
}

/**
 * 生成导入任务追踪的 Storage key。
 */
export function buildJobsStorageKey(importId) {
  return `assets-import-jobs:${importId}`;
}

/**
 * 生成导入运行状态的 Storage key。
 */
export function buildImportStateKey(importId) {
  return `assets-import-state:${importId}`;
}

/**
 * 从 Assets API 返回的 submitResults URL 中提取 executionId。
 * URL 格式: .../executions/{executionId}/data
 */
export function extractExecutionId(submitResultsUrl) {
  const urlParts = submitResultsUrl.split('/');
  return urlParts[urlParts.length - 2];
}

/**
 * 解析 Jira / Assets API 响应，非 2xx 时抛出错误。
 */
export async function parseJiraResponse(response, label) {
  const bodyText = await response.text();
  let body;

  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = bodyText;
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body?.errorMessages?.length
        ? body.errorMessages.join(', ')
        : `Assets API (${label}) failed with status ${response.status}`;

    throw new Error(message);
  }

  return body;
}

/**
 * 返回 schema 与 mapping 配置，用于 PUT /mapping 端点。
 * selector "devices" 对应提交数据时的顶层 key。
 */
export function buildMappingPayload() {
  return {
    schema: {
      objectSchema: {
        name: 'Forge Import Demo',
        description: 'Demo schema for Forge Assets Import',
        objectTypes: [
          {
            externalId: 'object-type/device',
            name: 'Device',
            description: 'Imported device from external source',
            attributes: [
              {
                externalId: 'object-type-attribute/id',
                name: 'Device ID',
                description: 'Unique device identifier',
                type: 'text',
                label: true,
                minimumCardinality: 1,
                maximumCardinality: 1,
              },
              {
                externalId: 'object-type-attribute/name',
                name: 'Name',
                description: 'Device display name',
                type: 'text',
                minimumCardinality: 0,
                maximumCardinality: 1,
              },
              {
                externalId: 'object-type-attribute/model',
                name: 'Model',
                description: 'Device model',
                type: 'text',
                minimumCardinality: 0,
                maximumCardinality: 1,
              },
              {
                externalId: 'object-type-attribute/status',
                name: 'Status',
                description: 'Operational status',
                type: 'text',
                minimumCardinality: 0,
                maximumCardinality: 1,
              },
            ],
          },
        ],
      },
    },
    mapping: {
      objectTypeMappings: [
        {
          objectTypeExternalId: 'object-type/device',
          objectTypeName: 'Device',
          selector: 'devices',
          description: 'Maps imported devices',
          attributesMapping: [
            {
              attributeExternalId: 'object-type-attribute/id',
              attributeName: 'Device ID',
              attributeLocators: ['id'],
              externalIdPart: true,
            },
            {
              attributeExternalId: 'object-type-attribute/name',
              attributeName: 'Name',
              attributeLocators: ['name'],
            },
            {
              attributeExternalId: 'object-type-attribute/model',
              attributeName: 'Model',
              attributeLocators: ['model'],
            },
            {
              attributeExternalId: 'object-type-attribute/status',
              attributeName: 'Status',
              attributeLocators: ['status'],
            },
          ],
        },
      ],
    },
  };
}

/**
 * 按 offset 获取一批设备数据（演示用）。
 * 实际项目中在此调用第三方 API，并返回 { items, hasMore }。
 */
export function fetchDeviceBatch(offset, batchSize = BATCH_SIZE) {
  const items = SAMPLE_DEVICES.slice(offset, offset + batchSize);
  return {
    items,
    hasMore: offset + batchSize < SAMPLE_DEVICES.length,
    nextOffset: offset + batchSize,
    totalCount: SAMPLE_DEVICES.length,
  };
}

/**
 * 将设备列表转换为 Assets import data 格式。
 */
export function transformDevicesForAssets(devices) {
  return {
    devices: devices.map((device) => ({
      id: device.id,
      name: device.name,
      model: device.model,
      status: device.status,
    })),
  };
}

/**
 * 创建新的 import execution，返回 executionId。
 */
export async function createImportExecution(workspaceId, importId) {
  const response = await api
    .asUser()
    .requestJira(
      route`/jsm/assets/workspace/${workspaceId}/v1/importsource/${importId}/executions`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

  const body = await parseJiraResponse(response, 'create execution');
  return extractExecutionId(body.links.submitResults);
}

/**
 * 向 execution 提交一批数据。
 */
export async function submitDataChunk(workspaceId, importId, executionId, data) {
  const response = await api
    .asApp()
    .requestJira(
      route`/jsm/assets/workspace/${workspaceId}/v1/importsource/${importId}/executions/${executionId}/data`,
      {
        method: 'POST',
        body: JSON.stringify({ data }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

  return parseJiraResponse(response, 'submit data chunk');
}

/**
 * 标记数据提交完成，通知 Assets 开始处理导入数据。
 */
export async function markImportCompleted(workspaceId, importId, executionId) {
  const response = await api
    .asApp()
    .requestJira(
      route`/jsm/assets/workspace/${workspaceId}/v1/importsource/${importId}/executions/${executionId}/data`,
      {
        method: 'POST',
        body: JSON.stringify({ completed: true }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

  return parseJiraResponse(response, 'mark import completed');
}

/**
 * 提交 schema 与 mapping 到 Assets。
 */
export async function submitMapping(workspaceId, importId) {
  const response = await api
    .asUser()
    .requestJira(
      route`/jsm/assets/workspace/${workspaceId}/v1/importsource/${importId}/mapping`,
      {
        method: 'PUT',
        body: JSON.stringify(buildMappingPayload()),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

  return parseJiraResponse(response, 'submit mapping');
}
