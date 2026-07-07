import React, { useEffect, useState } from 'react';
import { view } from '@forge/bridge';

// 与 create 扩展中 CUSTOM_FIELDS 的 key 保持一致
const CUSTOM_FIELD_KEYS = ['Custom Test', 'Custom Name'];

function App() {
  const [fieldValues, setFieldValues] = useState(null);

  useEffect(() => {
    // 从 extension context 读取创建请求时保存的自定义属性
    view.getContext().then((context) => {
      console.log(context);
      const savedFields = context?.extension?.request?.properties?.value?.fields || [];
      const values = CUSTOM_FIELD_KEYS.reduce((result, key) => {
        const matchedField = savedFields.find((field) => field.key === key);
        result[key] = matchedField?.value || '-';
        return result;
      }, {});
      setFieldValues(values);
    });
  }, []);

  if (!fieldValues) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {CUSTOM_FIELD_KEYS.map((key) => (
        <div key={key} style={{ marginBottom: '8px' }}>
          <strong>{key}:</strong> {fieldValues[key]}
        </div>
      ))}
    </div>
  );
}

export default App;
