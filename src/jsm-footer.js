import api, { getAppContext, route } from '@forge/api';
import { kvs } from '@forge/kvs';
import Resolver from '@forge/resolver';

const resolver = new Resolver();
const STORAGE_KEY_PREFIX = 'footer-demo';

/**
 * 按 accountId 生成 Storage key。
 * anonymous 用户的 accountId 固定为 "unidentified"，所有匿名用户会共用同一条数据。
 */
function buildStorageKey(accountId) {
  return `${STORAGE_KEY_PREFIX}:${accountId || 'unidentified'}`;
}

/**
 * 将 Forge API 响应解析为可返回给前端的 JSON 对象。
 * 非 2xx 响应会抛出错误，便于在前端展示失败原因。
 */
async function parseJiraResponse(response, label) {
  const bodyText = await response.text();
  let body;

  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = bodyText;
  }

  console.log(response, 'response');

  if (!response.ok) {
    console.error(response, 'error-response');
    const message =
      typeof body === 'object' && body?.errorMessages?.length
        ? body.errorMessages.join(', ')
        : `Jira API (${label}) failed with status ${response.status}`;

    throw new Error(message);
  }

  return body;
}

/**
 * api.asUser()：以「当前触发 resolver 的用户」身份调用 Jira REST API。
 * Forge 会校验该用户是否具备访问该 API 的权限，更安全，resolver 场景优先使用。
 */
resolver.define('testAsUser', async () => {
  const response = await api.asUser().requestJira(route`/rest/api/3/myself`);
  const user = await parseJiraResponse(response, 'asUser /myself');

  return {
    mode: 'asUser',
    description: '以当前登录用户身份调用 /rest/api/3/myself',
    displayName: user.displayName,
    accountId: user.accountId,
    accountType: user.accountType,
    active: user.active,
  };
});

/**
 * api.asApp()：以「应用安装身份」调用 Jira REST API，使用 manifest 中声明的 scopes。
 * 不继承当前用户的权限边界；若在用户上下文中使用，需自行做授权校验。
 */
resolver.define('testAsApp', async () => {
  const response = await api.asApp().requestJira(
    route`/rest/api/3/project/search?maxResults=3`
  );
  const data = await parseJiraResponse(response, 'asApp /project/search');

  return {
    mode: 'asApp',
    description: '以应用身份调用 /rest/api/3/project/search',
    totalProjects: data.total,
    projects: (data.values || []).map((project) => ({
      key: project.key,
      name: project.name,
    })),
  };
});

/**
 * 返回后端 resolver 能拿到的全部 context，便于调试。
 * - resolverContext：每次 invoke 时 Forge 注入的上下文（含 accountType、extension 等）
 * - invokePayload：前端 invoke(name, payload) 传入的 payload
 * - appContext：当前函数运行的应用级上下文（环境、安装信息等）
 */
resolver.define('getBackendContext', (req) => {
  const appContext = getAppContext();

  return {
    resolverContext: req.context,
    invokePayload: req.payload,
    appContext: {
      appVersion: appContext.appVersion,
      environmentType: appContext.environmentType,
      environmentAri: String(appContext.environmentAri),
      installationAri: String(appContext.installationAri),
      moduleKey: appContext.moduleKey,
      invocationId: appContext.invocationId,
      invocationRemainingTimeInMillis: appContext.invocationRemainingTimeInMillis(),
      license: appContext.license,
      installation: appContext.installation,
      permissions: appContext.permissions,
    },
  };
});

/**
 * 常见值：licensed（授权用户）、customer（客户）、anonymous（匿名）、unlicensed（未授权）。
 */
resolver.define('getAccountType', (req) => {
  return {
    accountType: req.context.accountType,
    accountId: req.context.accountId,
    description: '从 resolver context 读取当前访问者的账户类型',
  };
});

/**
 * invoke 最简示例：前端 invoke('getRandomString') 即可拿到返回值。
 */
resolver.define('getRandomString', () => {
  return `forge-${Math.random().toString(36).slice(2, 10)}`;
});

/**
 * Storage 写入测试：把当前用户的一条记录写入 Forge KVS。
 */
resolver.define('saveStorage', async (req) => {
  const accountId = req.context.accountId || 'unidentified';
  const key = buildStorageKey(accountId);
  const value = {
    message: req.payload?.message || 'Hello from Forge Storage',
    accountType: req.context.accountType,
    accountId,
    savedAt: new Date().toISOString(),
  };

  await kvs.set(key, value);

  return {
    action: 'save',
    key,
    value,
    note:
      accountId === 'unidentified'
        ? 'anonymous 用户共用 key footer-demo:unidentified'
        : '数据已按 accountId 隔离存储',
  };
});

/**
 * Storage 读取测试：读取当前用户对应的存储记录。
 */
resolver.define('readStorage', async (req) => {
  const accountId = req.context.accountId || 'unidentified';
  const key = buildStorageKey(accountId);
  const value = await kvs.get(key);

  return {
    action: 'read',
    key,
    value: value ?? null,
    note: value ? '读取成功' : '尚无数据，请先点击「写入 Storage」',
  };
});

/**
 * Storage 清除测试：删除当前用户对应的存储记录。
 */
resolver.define('clearStorage', async (req) => {
  const accountId = req.context.accountId || 'unidentified';
  const key = buildStorageKey(accountId);

  await kvs.delete(key);

  return {
    action: 'clear',
    key,
    note: '已删除当前 key 对应的数据',
  };
});

export const handler = resolver.getDefinitions();
