import { CustomSelect, FormControl } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { useModelCustomSelect } from 'common/hooks/useModelCustomSelect';
import { useControlAdapterIsEnabled } from 'features/controlAdapters/hooks/useControlAdapterIsEnabled';
import { useControlAdapterModel } from 'features/controlAdapters/hooks/useControlAdapterModel';
import { useControlAdapterModelQuery } from 'features/controlAdapters/hooks/useControlAdapterModelQuery';
import { useControlAdapterType } from 'features/controlAdapters/hooks/useControlAdapterType';
import { controlAdapterModelChanged } from 'features/controlAdapters/store/controlAdaptersSlice';
import { pick } from 'lodash-es';
import { memo, useCallback, useMemo } from 'react';
import type { ControlNetConfig, IPAdapterConfig, T2IAdapterConfig } from 'services/api/types';

type ParamControlAdapterModelProps = {
  id: string;
};

const ParamControlAdapterModel = ({ id }: ParamControlAdapterModelProps) => {
  const isEnabled = useControlAdapterIsEnabled(id);
  const controlAdapterType = useControlAdapterType(id);
  const model = useControlAdapterModel(id);
  const dispatch = useAppDispatch();
  const currentBaseModel = useAppSelector((s) => s.generation.model?.base);

  const { data, isLoading } = useControlAdapterModelQuery(controlAdapterType);

  const _onChange = useCallback(
    (model: ControlNetConfig | IPAdapterConfig | T2IAdapterConfig | null) => {
      if (!model) {
        return;
      }
      dispatch(
        controlAdapterModelChanged({
          id,
          model: pick(model, 'base', 'key'),
        })
      );
    },
    [dispatch, id]
  );

  const selectedModel = useMemo(
    () => (model && controlAdapterType ? { ...model, model_type: controlAdapterType } : null),
    [controlAdapterType, model]
  );

  const { items, selectedItem, onChange, placeholder } = useModelCustomSelect({
    data,
    isLoading,
    selectedModel,
    onChange: _onChange,
    modelFilter: (model) => model.base === currentBaseModel,
  });

  return (
    <FormControl isDisabled={!items.length || !isEnabled} isInvalid={!selectedItem || !items.length}>
      <CustomSelect selectedItem={selectedItem} placeholder={placeholder} items={items} onChange={onChange} />
    </FormControl>
  );
};

export default memo(ParamControlAdapterModel);
