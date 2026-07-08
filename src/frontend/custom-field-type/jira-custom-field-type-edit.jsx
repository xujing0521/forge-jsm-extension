import React, { useState, useCallback } from 'react';
import ForgeReconciler, { Textfield } from '@forge/react';
import { CustomFieldEdit } from '@forge/react/jira';
import { view } from '@forge/bridge';

const Edit = () => {
  const [value, setValue] = useState('defaultValue');

  const onSubmit = useCallback(async () => {
    try {
      await view.submit(value);
    } catch (e) {
      console.error(e);
    }
  }, [view, value]);

  const handleOnChange = useCallback((e) => {
    setValue(e.target.value);
  }, []);

  return (
    <CustomFieldEdit onSubmit={onSubmit}>
      <Textfield onChange={handleOnChange} />
    </CustomFieldEdit>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <Edit />
  </React.StrictMode>
);
