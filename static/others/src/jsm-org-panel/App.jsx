import React, { useEffect, useState } from 'react';
import { view } from '@forge/bridge';

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    view.getContext().then((context) => {
      const type = context?.extension?.type;
      setData(type);
    });
  }, []);

  return (
    <div>
      <div>{ data || '' }</div>
      JSM Extension
    </div>
  );
}

export default App;
