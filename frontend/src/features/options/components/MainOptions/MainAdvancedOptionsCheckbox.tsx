import React, { ChangeEvent } from 'react';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/storeHooks';
import IAICheckbox from 'common/components/IAICheckbox';
import { setShowAdvancedOptions } from 'features/options/store/optionsSlice';

export default function MainAdvancedOptionsCheckbox() {
  const showAdvancedOptions = useAppSelector(
    (state: RootState) => state.options.showAdvancedOptions
  );
  const dispatch = useAppDispatch();

  const handleShowAdvancedOptions = (e: ChangeEvent<HTMLInputElement>) =>
    dispatch(setShowAdvancedOptions(e.target.checked));

  return (
    <IAICheckbox
      label="Advanced Options"
      styleClass="advanced-options-checkbox"
      onChange={handleShowAdvancedOptions}
      isChecked={showAdvancedOptions}
    />
  );
}
