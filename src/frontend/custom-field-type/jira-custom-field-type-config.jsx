import React, { useState, useEffect } from 'react';
import ForgeReconciler, {
  Form,
  Label,
  Textfield,
  useForm,
  FormSection,
  FormFooter,
  LoadingButton,
  Button,
  ButtonGroup,
} from "@forge/react";
import { view } from '@forge/bridge';

const ContextConfig = () => {
  const [extensionData, setExtensionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [configuration, setConfiguration] = useState(() => ({regex: '^[A-Za-z]+$'}));
  const { handleSubmit, register, getFieldId, getValues } = useForm();

  useEffect(() => {
    view.getContext().then(({ extension }) => {
      setExtensionData(extension);

      if (extension.configuration) {
        setConfiguration(extension.configuration);
      }
    });
  }, []);

  const onSubmit = async () => {
    try {
      setIsLoading(true);
      const { regex } = getValues();
      await view.submit({
        configuration: {
          regex: regex || configuration.regex
        }
      });
    } catch (e) {
      setIsLoading(false);
      console.error(e);
    }
  }

  if (!extensionData) {
    return <Textfield>Loading...</Textfield>;
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <FormSection>
        <Label labelFor={getFieldId('regex')}>
          Validation RegEx
        </Label>
        <Textfield {...register('regex')} />
      </FormSection>
      <FormFooter align="start">
        <ButtonGroup>
          <Button appearance="subtle" onClick={view.close}>Close</Button>
          <LoadingButton appearance="primary" type="submit" isLoading={isLoading}>
            Submit
          </LoadingButton>
        </ButtonGroup>
      </FormFooter>
    </Form>
  )
}

ForgeReconciler.render(
  <React.StrictMode>
    <ContextConfig />
  </React.StrictMode>
);
