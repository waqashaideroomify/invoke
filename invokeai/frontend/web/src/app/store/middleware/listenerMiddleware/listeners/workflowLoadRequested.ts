import { logger } from 'app/logging/logger';
import type { AppStartListening } from 'app/store/middleware/listenerMiddleware';
import { parseify } from 'common/util/serialize';
import { workflowLoaded, workflowLoadRequested } from 'features/nodes/store/actions';
import { $templates } from 'features/nodes/store/nodesSlice';
import { $flow } from 'features/nodes/store/reactFlowInstance';
import type { Templates } from 'features/nodes/store/types';
import { WorkflowMigrationError, WorkflowVersionError } from 'features/nodes/types/error';
import { graphToWorkflow } from 'features/nodes/util/workflow/graphToWorkflow';
import { validateWorkflow } from 'features/nodes/util/workflow/validateWorkflow';
import { addToast } from 'features/system/store/systemSlice';
import { makeToast } from 'features/system/util/makeToast';
import { t } from 'i18next';
import { checkBoardAccess, checkImageAccess, checkModelAccess } from 'services/api/hooks/accessChecks';
import type { GraphAndWorkflowResponse, NonNullableGraph } from 'services/api/types';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

const getWorkflow = async (data: GraphAndWorkflowResponse, templates: Templates) => {
  if (data.workflow) {
    // Prefer to load the workflow if it's available - it has more information
    const parsed = JSON.parse(data.workflow);
    return await validateWorkflow(parsed, templates, checkImageAccess, checkBoardAccess, checkModelAccess);
  } else if (data.graph) {
    // Else we fall back on the graph, using the graphToWorkflow function to convert and do layout
    const parsed = JSON.parse(data.graph);
    const workflow = graphToWorkflow(parsed as NonNullableGraph, true);
    return await validateWorkflow(workflow, templates, checkImageAccess, checkBoardAccess, checkModelAccess);
  } else {
    throw new Error('No workflow or graph provided');
  }
};

export const addWorkflowLoadRequestedListener = (startAppListening: AppStartListening) => {
  startAppListening({
    actionCreator: workflowLoadRequested,
    effect: async (action, { dispatch }) => {
      const log = logger('nodes');
      const { data, asCopy } = action.payload;
      const nodeTemplates = $templates.get();

      try {
        const { workflow, warnings } = await getWorkflow(data, nodeTemplates);

        if (asCopy) {
          // If we're loading a copy, we need to remove the ID so that the backend will create a new workflow
          delete workflow.id;
        }

        dispatch(workflowLoaded(workflow));
        if (!warnings.length) {
          dispatch(
            addToast(
              makeToast({
                title: t('toast.workflowLoaded'),
                status: 'success',
              })
            )
          );
        } else {
          dispatch(
            addToast(
              makeToast({
                title: t('toast.loadedWithWarnings'),
                status: 'warning',
              })
            )
          );
          warnings.forEach(({ message, ...rest }) => {
            log.warn(rest, message);
          });
        }

        requestAnimationFrame(() => {
          $flow.get()?.fitView();
        });
      } catch (e) {
        if (e instanceof WorkflowVersionError) {
          // The workflow version was not recognized in the valid list of versions
          log.error({ error: parseify(e) }, e.message);
          dispatch(
            addToast(
              makeToast({
                title: t('nodes.unableToValidateWorkflow'),
                status: 'error',
                description: e.message,
              })
            )
          );
        } else if (e instanceof WorkflowMigrationError) {
          // There was a problem migrating the workflow to the latest version
          log.error({ error: parseify(e) }, e.message);
          dispatch(
            addToast(
              makeToast({
                title: t('nodes.unableToValidateWorkflow'),
                status: 'error',
                description: e.message,
              })
            )
          );
        } else if (e instanceof z.ZodError) {
          // There was a problem validating the workflow itself
          const { message } = fromZodError(e, {
            prefix: t('nodes.workflowValidation'),
          });
          log.error({ error: parseify(e) }, message);
          dispatch(
            addToast(
              makeToast({
                title: t('nodes.unableToValidateWorkflow'),
                status: 'error',
                description: message,
              })
            )
          );
        } else {
          // Some other error occurred
          log.error({ error: parseify(e) }, t('nodes.unknownErrorValidatingWorkflow'));
          dispatch(
            addToast(
              makeToast({
                title: t('nodes.unableToValidateWorkflow'),
                status: 'error',
                description: t('nodes.unknownErrorValidatingWorkflow'),
              })
            )
          );
        }
      }
    },
  });
};
