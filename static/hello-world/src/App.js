import React, {useState, Fragment} from 'react';
import debounce from 'lodash/debounce';
import {view} from '@forge/bridge';
import styled from 'styled-components';
import Form, {Field, ErrorMessage} from '@atlaskit/form';
import Textfield from '@atlaskit/textfield';

const Content = styled.div`
  overflow: hidden;
`;

// 自定义字段配置：新增字段只需在此数组中添加一项
const CUSTOM_FIELDS = [
  { key: 'Custom Field', minLength: 5, placeholder: 'Enter custom field value' },
  { key: 'Custom Name', minLength: 2, placeholder: 'Enter custom name' },
];

function App() {
  const [fieldData, setField] = useState({});
  const [error, setError] = useState({});

  const validateField = ({fieldName, fieldValue, minLength}) => {
    const fieldConfig = CUSTOM_FIELDS.find((field) => field.key === fieldName);
    if (!fieldConfig) {
      return true;
    }

    const errorMsg = !fieldValue || fieldValue.length < minLength
      ? `Please provide a value for required field "${fieldName}" (min ${minLength} characters)`
      : undefined;

    setError((prevError) => ({...prevError, [fieldName]: errorMsg}));
    return !errorMsg;
  };

  const onInputChangeHandler = ({name, value}) => {
    const newFieldData = name ? {...fieldData, [name]: value} : fieldData;
    setField(newFieldData);

    const fields = [];
    let isValid = true;

    // 遍历所有已填写的字段，构建 submit 数据并校验
    for (const property in newFieldData) {
      fields.push({key: property, value: newFieldData[property]});

      const fieldConfig = CUSTOM_FIELDS.find((field) => field.key === property);
      isValid = validateField({
        fieldName: property,
        fieldValue: newFieldData[property],
        minLength: fieldConfig?.minLength || 0,
      }) && isValid;
    }

    const formData = {
      fields,
      isValid,
    };

    // 将表单数据提交给 Forge，创建请求时会持久化为 Issue Property
    try {
      view.submit(formData);
    } catch (errorTrace) {
      console.log("Couldn't save custom fields: ", errorTrace);
    }
  };

  const debounceOnChange = debounce(({name, value}) => onInputChangeHandler({name, value}), 400);

  return (
    <Content>
      <Form>
        {({formProps}) => (
          <form {...formProps}>
            {CUSTOM_FIELDS.map((customField) => (
              <Field key={customField.key} label={customField.key} name={customField.key}>
                {({fieldProps}) => (
                  <Fragment>
                    <Textfield
                      {...fieldProps}
                      placeholder={customField.placeholder}
                      onChange={(event) => debounceOnChange({name: event.target.name, value: event.target.value})}
                    />
                    {error[customField.key] && <ErrorMessage>{error[customField.key]}</ErrorMessage>}
                  </Fragment>
                )}
              </Field>
            ))}
          </form>
        )}
      </Form>
    </Content>
  );
}

export default App;
