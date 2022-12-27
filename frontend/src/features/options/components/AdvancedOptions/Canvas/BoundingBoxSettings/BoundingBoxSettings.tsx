import { Box, Flex } from '@chakra-ui/react';
import { createSelector } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector } from 'app/storeHooks';
import IAISlider from 'common/components/IAISlider';
import { canvasSelector } from 'features/canvas/store/canvasSelectors';
import { setBoundingBoxDimensions } from 'features/canvas/store/canvasSlice';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';

const selector = createSelector(
  canvasSelector,
  (canvas) => {
    const { boundingBoxDimensions, boundingBoxScaleMethod: boundingBoxScale } =
      canvas;
    return {
      boundingBoxDimensions,
      boundingBoxScale,
    };
  },
  {
    memoizeOptions: {
      resultEqualityCheck: _.isEqual,
    },
  }
);

const BoundingBoxSettings = () => {
  const dispatch = useAppDispatch();
  const { boundingBoxDimensions } = useAppSelector(selector);

  const { t } = useTranslation();

  const handleChangeWidth = (v: number) => {
    dispatch(
      setBoundingBoxDimensions({
        ...boundingBoxDimensions,
        width: Math.floor(v),
      })
    );
  };

  const handleChangeHeight = (v: number) => {
    dispatch(
      setBoundingBoxDimensions({
        ...boundingBoxDimensions,
        height: Math.floor(v),
      })
    );
  };

  const handleResetWidth = () => {
    dispatch(
      setBoundingBoxDimensions({
        ...boundingBoxDimensions,
        width: Math.floor(512),
      })
    );
  };

  const handleResetHeight = () => {
    dispatch(
      setBoundingBoxDimensions({
        ...boundingBoxDimensions,
        height: Math.floor(512),
      })
    );
  };

  return (
    <Flex direction="column" gap="1rem">
      <IAISlider
        label={t('options:width')}
        min={64}
        max={1024}
        step={64}
        value={boundingBoxDimensions.width}
        onChange={handleChangeWidth}
        handleReset={handleResetWidth}
        sliderNumberInputProps={{ max: 4096 }}
        withSliderMarks
        withInput
        withReset
      />
      <IAISlider
        label={t('options:height')}
        min={64}
        max={1024}
        step={64}
        value={boundingBoxDimensions.height}
        onChange={handleChangeHeight}
        handleReset={handleResetHeight}
        sliderNumberInputProps={{ max: 4096 }}
        withSliderMarks
        withInput
        withReset
      />
    </Flex>
  );
};

export default BoundingBoxSettings;

export const BoundingBoxSettingsHeader = () => {
  const { t } = useTranslation();
  return (
    <Box flex="1" textAlign="left">
      {t('options:boundingBoxHeader')}
    </Box>
  );
};
