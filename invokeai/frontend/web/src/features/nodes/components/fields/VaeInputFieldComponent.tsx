import {
  VaeInputFieldTemplate,
  VaeInputFieldValue,
} from 'features/nodes/types/types';
import { memo } from 'react';
import { FieldComponentProps } from './types';

const VaeInputFieldComponent = (
  props: FieldComponentProps<VaeInputFieldValue, VaeInputFieldTemplate>
) => {
  const { nodeId, field } = props;

  return null;
};

export default memo(VaeInputFieldComponent);
