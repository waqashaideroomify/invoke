import { createSelector } from '@reduxjs/toolkit';
// import IAICanvas from 'features/canvas/IAICanvas';
import IAICanvasResizer from 'features/canvas/IAICanvasResizer';
import _ from 'lodash';
import { useLayoutEffect } from 'react';
import { RootState, useAppDispatch, useAppSelector } from 'app/store';
import ImageUploadButton from 'common/components/ImageUploaderButton';
import {
  CanvasState,
  setDoesCanvasNeedScaling,
} from 'features/canvas/canvasSlice';
import IAICanvas from 'features/canvas/IAICanvas';
import IAICanvasOutpaintingControls from 'features/canvas/IAICanvasOutpaintingControls';

const outpaintingDisplaySelector = createSelector(
  [(state: RootState) => state.canvas],
  (canvas: CanvasState) => {
    const {
      doesCanvasNeedScaling,
      outpainting: {
        layerState: { objects },
      },
    } = canvas;
    return {
      doesCanvasNeedScaling,
      doesOutpaintingHaveObjects: objects.length > 0,
    };
  },
  {
    memoizeOptions: {
      resultEqualityCheck: _.isEqual,
    },
  }
);

const OutpaintingDisplay = () => {
  const dispatch = useAppDispatch();
  const { doesCanvasNeedScaling, doesOutpaintingHaveObjects } = useAppSelector(
    outpaintingDisplaySelector
  );

  useLayoutEffect(() => {
    const resizeCallback = _.debounce(
      () => dispatch(setDoesCanvasNeedScaling(true)),
      250
    );
    window.addEventListener('resize', resizeCallback);
    return () => window.removeEventListener('resize', resizeCallback);
  }, [dispatch]);

  const outpaintingComponent = doesOutpaintingHaveObjects ? (
    <div className="inpainting-main-area">
      <IAICanvasOutpaintingControls />
      <div className="inpainting-canvas-area">
        {doesCanvasNeedScaling ? <IAICanvasResizer /> : <IAICanvas />}
      </div>
    </div>
  ) : (
    <ImageUploadButton />
  );

  return (
    <div className={'workarea-single-view'}>
      <div className="workarea-split-view-left">{outpaintingComponent}</div>
    </div>
  );
};

export default OutpaintingDisplay;
