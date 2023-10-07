import { createSelector } from '@reduxjs/toolkit';
import { useAppSelector, useAppDispatch } from 'app/store/storeHooks';
import { defaultSelectorOptions } from 'app/store/util/defaultMemoizeOptions';
import { useCallback } from 'react';
import { stateSelector } from 'app/store/store';
import IAIInformationalPopover from 'common/components/IAIInformationalPopover/IAIInformationalPopover';
import { setHrfStrength } from 'features/parameters/store/generationSlice';
import IAISlider from 'common/components/IAISlider';

const selector = createSelector(
  [stateSelector],
  ({ generation, hotkeys, config }) => {
    const { initial, min, sliderMax, inputMax, fineStep, coarseStep } =
      config.sd.hrfStrength;
    const { hrfStrength } = generation;
    const step = hotkeys.shift ? fineStep : coarseStep;

    return {
      hrfStrength,
      initial,
      min,
      sliderMax,
      inputMax,
      step,
    };
  },
  defaultSelectorOptions
);

export default function ParamHrfStrength() {
  const { hrfStrength, initial, min, sliderMax, step } =
    useAppSelector(selector);
  const dispatch = useAppDispatch();

  const handleHrfStrengthReset = useCallback(() => {
    dispatch(setHrfStrength(initial));
  }, [dispatch, initial]);

  const handleHrfStrengthChange = useCallback(
    (v: number) => {
      dispatch(setHrfStrength(v));
    },
    [dispatch]
  );

  return (
    <IAIInformationalPopover feature="hrf" placement="bottom">
      <IAISlider
        label="Denoising Strength"
        aria-label="High Resolution Denoising Strength"
        min={min}
        max={sliderMax}
        step={step}
        value={hrfStrength}
        onChange={handleHrfStrengthChange}
        withSliderMarks
        withInput
        withReset
        handleReset={handleHrfStrengthReset}
      />
    </IAIInformationalPopover>
  );
}
