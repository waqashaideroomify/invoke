import { createSelector } from '@reduxjs/toolkit';
import { stateSelector } from 'app/store/store';
import { useAppSelector } from 'app/store/storeHooks';
import { defaultSelectorOptions } from 'app/store/util/defaultMemoizeOptions';
import { useMemo } from 'react';
import { isInvocationNode } from '../types/types';

export const useEmbedWorkflow = (nodeId: string) => {
  const selector = useMemo(
    () =>
      createSelector(
        stateSelector,
        ({ nodes }) => {
          const node = nodes.present.nodes.find((node) => node.id === nodeId);
          if (!isInvocationNode(node)) {
            return false;
          }
          return node.data.embedWorkflow;
        },
        defaultSelectorOptions
      ),
    [nodeId]
  );

  const embedWorkflow = useAppSelector(selector);
  return embedWorkflow;
};
