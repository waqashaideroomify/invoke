import { createSelector } from '@reduxjs/toolkit';
import { stateSelector } from 'app/store/store';
import { useAppSelector } from 'app/store/storeHooks';
import { defaultSelectorOptions } from 'app/store/util/defaultMemoizeOptions';
import { useMemo } from 'react';
import { isInvocationNode } from '../types/types';
import { KIND_MAP } from '../types/constants';

export const useFieldTemplateTitle = (
  nodeId: string,
  fieldName: string,
  kind: 'input' | 'output'
) => {
  const selector = useMemo(
    () =>
      createSelector(
        stateSelector,
        ({ nodes }) => {
          const node = nodes.present.nodes.find((node) => node.id === nodeId);
          if (!isInvocationNode(node)) {
            return;
          }
          const nodeTemplate = nodes.present.nodeTemplates[node?.data.type ?? ''];
          return nodeTemplate?.[KIND_MAP[kind]][fieldName]?.title;
        },
        defaultSelectorOptions
      ),
    [fieldName, kind, nodeId]
  );

  const fieldTemplate = useAppSelector(selector);

  return fieldTemplate;
};
