import { Flex } from '@chakra-ui/react';
import { createSelector } from '@reduxjs/toolkit';
import { stateSelector } from 'app/store/store';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { defaultSelectorOptions } from 'app/store/util/defaultMemoizeOptions';
import IAIDropOverlay from 'common/components/IAIDropOverlay';
import IAICanvas from 'features/canvas/components/IAICanvas';
import IAICanvasToolbar from 'features/canvas/components/IAICanvasToolbar/IAICanvasToolbar';
import { requestCanvasRescale } from 'features/canvas/store/thunks/requestCanvasScale';
import { useDroppableTypesafe } from 'features/dnd/hooks/typesafeHooks';
import { CanvasInitialImageDropData } from 'features/dnd/types';
import { isValidDrop } from 'features/dnd/util/isValidDrop';
import { memo, useLayoutEffect } from 'react';

const selector = createSelector(
  [stateSelector],
  ({ canvas }) => {
    const { doesCanvasNeedScaling } = canvas;
    return {
      doesCanvasNeedScaling,
    };
  },
  defaultSelectorOptions
);

const droppableData: CanvasInitialImageDropData = {
  id: 'canvas-intial-image',
  actionType: 'SET_CANVAS_INITIAL_IMAGE',
};

const UnifiedCanvasContent = () => {
  const dispatch = useAppDispatch();

  const { doesCanvasNeedScaling } = useAppSelector(selector);

  const {
    isOver,
    setNodeRef: setDroppableRef,
    active,
  } = useDroppableTypesafe({
    id: 'unifiedCanvas',
    data: droppableData,
  });

  useLayoutEffect(() => {
    const resizeCallback = () => {
      dispatch(requestCanvasRescale());
    };

    window.addEventListener('resize', resizeCallback);

    return () => window.removeEventListener('resize', resizeCallback);
  }, [dispatch]);

  return (
    <Flex
      layerStyle="first"
      ref={setDroppableRef}
      tabIndex={-1}
      sx={{
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        p: 2,
        borderRadius: 'base',
        w: 'full',
        h: 'full',
      }}
    >
      <IAICanvasToolbar />
      <IAICanvas />
      {/* {doesCanvasNeedScaling ? <IAICanvasResizer /> : <IAICanvas />} */}
      {isValidDrop(droppableData, active) && (
        <IAIDropOverlay isOver={isOver} label="Set Canvas Initial Image" />
      )}
    </Flex>
  );
};

export default memo(UnifiedCanvasContent);
