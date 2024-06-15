import { FormControl, FormLabel, Switch } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { InformationalPopover } from 'common/components/InformationalPopover/InformationalPopover';
import { setSeamlessXAxis } from 'features/controlLayers/store/canvasV2Slice';
import type { ChangeEvent } from 'react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const ParamSeamlessXAxis = () => {
  const { t } = useTranslation();
  const seamlessXAxis = useAppSelector((s) => s.canvasV2.params.seamlessXAxis);

  const dispatch = useAppDispatch();

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      dispatch(setSeamlessXAxis(e.target.checked));
    },
    [dispatch]
  );

  return (
    <FormControl>
      <InformationalPopover feature="seamlessTilingXAxis">
        <FormLabel>{t('parameters.seamlessXAxis')}</FormLabel>
      </InformationalPopover>
      <Switch isChecked={seamlessXAxis} onChange={handleChange} />
    </FormControl>
  );
};

export default memo(ParamSeamlessXAxis);
