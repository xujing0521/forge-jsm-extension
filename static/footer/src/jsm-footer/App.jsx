import React, { useCallback, useEffect, useState } from 'react';
import { invoke, view } from '@forge/bridge';

const cardStyle = {
  border: '1px solid #dfe1e6',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '12px',
  background: '#fafbfc',
};

const buttonStyle = {
  marginRight: '8px',
  marginBottom: '8px',
  padding: '6px 12px',
  cursor: 'pointer',
};

const inputStyle = {
  width: '100%',
  maxWidth: '360px',
  padding: '6px 8px',
  marginBottom: '8px',
  boxSizing: 'border-box',
};

function ResultCard({ title, result }) {
  if (!result) {
    return null;
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {result.error ? (
        <p style={{ color: '#de350b', margin: 0 }}>{result.error}</p>
      ) : typeof result.data === 'string' ? (
        <p style={{ margin: 0, fontSize: '14px' }}>{result.data}</p>
      ) : (
        <pre
          style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '12px',
          }}
        >
          {JSON.stringify(result.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

function App() {
  const [frontendContext, setFrontendContext] = useState(null);
  const [backendContext, setBackendContext] = useState(null);
  const [asUserResult, setAsUserResult] = useState(null);
  const [asAppResult, setAsAppResult] = useState(null);
  const [accountTypeResult, setAccountTypeResult] = useState(null);
  const [randomString, setRandomString] = useState(null);
  const [storageResult, setStorageResult] = useState(null);
  const [storageMessage, setStorageMessage] = useState('Hello from Forge Storage');
  const [loading, setLoading] = useState(null);

  const loadFrontendContext = useCallback(async () => {
    setLoading('frontendContext');

    try {
      const context = await view.getContext();
      setFrontendContext({ data: context });
    } catch (error) {
      setFrontendContext({
        error: error?.message || '读取前端 context 失败',
      });
    } finally {
      setLoading(null);
    }
  }, []);

  useEffect(() => {
    loadFrontendContext();
  }, [loadFrontendContext]);

  const runTest = useCallback(async (resolverName, setResult, payload) => {
    setLoading(resolverName);
    setResult(null);

    try {
      const data = await invoke(resolverName, payload);
      setResult({ data });
    } catch (error) {
      setResult({
        error: error?.message || '调用 resolver 失败',
      });
    } finally {
      setLoading(null);
    }
  }, []);

  return (
    <div style={{ padding: '8px 0', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>Forge API 身份测试</h2>

      <h3 style={{ marginBottom: '8px' }}>Context 调试</h3>
      <p style={{ marginTop: 0, color: '#5e6c84', fontSize: '13px' }}>
        前端用 view.getContext()；后端用 resolver 的 req.context + getAppContext()。
      </p>
      <div>
        <button
          type="button"
          style={buttonStyle}
          disabled={loading !== null}
          onClick={loadFrontendContext}
        >
          {loading === 'frontendContext' ? '加载中...' : '刷新前端 Context'}
        </button>
        <button
          type="button"
          style={buttonStyle}
          disabled={loading !== null}
          onClick={() => runTest('getBackendContext', setBackendContext, {
            from: 'frontend',
            clickedAt: new Date().toISOString(),
          })}
        >
          {loading === 'getBackendContext' ? '加载中...' : '获取后端 Context'}
        </button>
      </div>
      <ResultCard title="前端 Context（view.getContext）" result={frontendContext} />
      <ResultCard title="后端 Context（resolver + getAppContext）" result={backendContext} />

      <p style={{ marginTop: '16px', color: '#5e6c84' }}>
        asUser / asApp 测试 Jira API；getAccountType 读取用户类型；Storage 测试 KVS 读写。
      </p>

      <div>
        <button
          type="button"
          style={buttonStyle}
          disabled={loading !== null}
          onClick={() => runTest('getRandomString', setRandomString)}
        >
          {loading === 'getRandomString' ? '调用中...' : 'invoke 示例（随机字符串）'}
        </button>
        <button
          type="button"
          style={buttonStyle}
          disabled={loading !== null}
          onClick={() => runTest('getAccountType', setAccountTypeResult)}
        >
          {loading === 'getAccountType' ? '获取中...' : 'getAccountType()'}
        </button>
        <button
          type="button"
          style={buttonStyle}
          disabled={loading !== null}
          onClick={() => runTest('testAsUser', setAsUserResult)}
        >
          {loading === 'testAsUser' ? '测试中...' : '测试 asUser()'}
        </button>
        <button
          type="button"
          style={buttonStyle}
          disabled={loading !== null}
          onClick={() => runTest('testAsApp', setAsAppResult)}
        >
          {loading === 'testAsApp' ? '测试中...' : '测试 asApp()'}
        </button>
      </div>

      <h3 style={{ marginBottom: '8px' }}>Storage 测试（@forge/kvs）</h3>
      <p style={{ marginTop: 0, color: '#5e6c84', fontSize: '13px' }}>
        key 格式为 footer-demo:&lt;accountId&gt;。anonymous 的 accountId 是 unidentified，会共用同一条数据。
      </p>
      <input
        type="text"
        style={inputStyle}
        value={storageMessage}
        onChange={(event) => setStorageMessage(event.target.value)}
        placeholder="要写入 Storage 的内容"
      />
      <div>
        <button
          type="button"
          style={buttonStyle}
          disabled={loading !== null}
          onClick={() => runTest('saveStorage', setStorageResult, { message: storageMessage })}
        >
          {loading === 'saveStorage' ? '写入中...' : '写入 Storage'}
        </button>
        <button
          type="button"
          style={buttonStyle}
          disabled={loading !== null}
          onClick={() => runTest('readStorage', setStorageResult)}
        >
          {loading === 'readStorage' ? '读取中...' : '读取 Storage'}
        </button>
        <button
          type="button"
          style={buttonStyle}
          disabled={loading !== null}
          onClick={() => runTest('clearStorage', setStorageResult)}
        >
          {loading === 'clearStorage' ? '清除中...' : '清除 Storage'}
        </button>
      </div>

      <ResultCard title="invoke 示例结果" result={randomString} />
      <ResultCard title="getAccountType 结果" result={accountTypeResult} />
      <ResultCard title="asUser 结果" result={asUserResult} />
      <ResultCard title="asApp 结果" result={asAppResult} />
      <ResultCard title="Storage 结果" result={storageResult} />
    </div>
  );
}

export default App;
