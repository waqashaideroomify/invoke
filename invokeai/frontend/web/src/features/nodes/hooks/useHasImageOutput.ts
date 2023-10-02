import { createSelector } from '@reduxjs/toolkit';
import { stateSelector } from 'app/store/store';
import { useAppSelector } from 'app/store/storeHooks';
import { defaultSelectorOptions } from 'app/store/util/defaultMemoizeOptions';
import { some } from 'lodash-es';
import { useMemo } from 'react';
import { IMAGE_FIELDS } from '../types/constants';
import { isInvocationNode } from '../types/types';

export const useHasImageOutput = (nodeId: string) => {
  const selector = useMemo(
    () =>
      createSelector(
        stateSelector,
        ({ nodes }) => {
          const node = nodes.present.nodes.find((node) => node.id === nodeId);
          if (!isInvocationNode(node)) {
            return false;
          }
          return some(
            node.data.outputs,
            (output) =>
              IMAGE_FIELDS.includes(output.type) &&
              // the image primitive node does not actually save the image, do not show the image-saving checkboxes
              node.data.type !== 'image'
          );
        },
        defaultSelectorOptions
      ),
    [nodeId]
  );

  const hasImageOutput = useAppSelector(selector);
  return hasImageOutput;
};
