import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Text,
  Button,
  Form,
  FormSection,
  FormFooter,
  Textfield,
  SectionMessage,
  Heading,
  HelperMessage,
  Spinner,
} from '@forge/react';
import { view, invoke } from '@forge/bridge';

const App = () => {
  const [context, setContext] = useState(null);
  const [description, setDescription] = useState('Forge Assets Import Demo');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const importId = context?.extension?.importId;
  const workspaceId = context?.extension?.workspaceId;
  const schemaId = context?.extension?.schemaId;

  useEffect(() => {
    view.getContext().then(async (ctx) => {
      setContext(ctx);

      if (ctx?.extension?.importId) {
        try {
          const config = await invoke('getConfiguration', {
            importId: ctx.extension.importId,
          });
          if (config?.description) {
            setDescription(config.description);
          }
        } catch (err) {
          console.error('Failed to load configuration', err);
        }
      }

      setLoading(false);
    });
  }, []);

  const onSubmit = async () => {
    if (!workspaceId || !importId) {
      setError('Missing workspaceId or importId from extension context');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await invoke('saveConfiguration', {
        workspaceId,
        importId,
        description,
      });

      setMessage(result.message || 'Configuration saved successfully');
    } catch (err) {
      console.error('Failed to save configuration', err);
      setError(err?.message || 'Failed to save configuration');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Spinner label="Loading configuration..." />;
  }

  return (
    <Form onSubmit={onSubmit}>
      <FormSection>
        <Heading size="medium">Configure Assets Import</Heading>

        <Text>
          Import ID: {importId || 'N/A'}
        </Text>
        <Text>
          Workspace ID: {workspaceId || 'N/A'}
        </Text>
        <Text>
          Schema ID: {schemaId || 'N/A'}
        </Text>

        <HelperMessage>
          Save configuration to submit the object schema and field mapping to Assets.
          After saving, the Import data button will become active.
        </HelperMessage>

        <Textfield
          label="Import description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {message && (
          <SectionMessage appearance="success">
            <Text>{message}</Text>
          </SectionMessage>
        )}

        {error && (
          <SectionMessage appearance="error">
            <Text>{error}</Text>
          </SectionMessage>
        )}
      </FormSection>

      <FormFooter>
        <Button appearance="primary" type="submit" isDisabled={submitting}>
          {submitting ? 'Saving...' : 'Save configuration'}
        </Button>
      </FormFooter>
    </Form>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
