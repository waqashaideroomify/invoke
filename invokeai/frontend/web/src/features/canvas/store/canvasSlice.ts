import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, isAnyOf } from '@reduxjs/toolkit';
import type { PersistConfig, RootState } from 'app/store/store';
import { roundDownToMultiple, roundToMultiple } from 'common/util/roundDownToMultiple';
import calculateCoordinates from 'features/canvas/util/calculateCoordinates';
import calculateScale from 'features/canvas/util/calculateScale';
import { STAGE_PADDING_PERCENTAGE } from 'features/canvas/util/constants';
import floorCoordinates from 'features/canvas/util/floorCoordinates';
import getScaledBoundingBoxDimensions from 'features/canvas/util/getScaledBoundingBoxDimensions';
import { initialAspectRatioState } from 'features/parameters/components/ImageSize/constants';
import type { AspectRatioState } from 'features/parameters/components/ImageSize/types';
import { modelChanged } from 'features/parameters/store/generationSlice';
import type { PayloadActionWithOptimalDimension } from 'features/parameters/store/types';
import { getIsSizeOptimal, getOptimalDimension } from 'features/parameters/util/optimalDimension';
import type { IRect, Vector2d } from 'konva/lib/types';
import { clamp, cloneDeep } from 'lodash-es';
import type { RgbaColor } from 'react-colorful';
import type { ImageDTO } from 'services/api/types';

import type {
  BoundingBoxScaleMethod,
  CanvasBaseLine,
  CanvasImage,
  CanvasLayer,
  CanvasLayerState,
  CanvasMaskLine,
  CanvasState,
  CanvasTool,
  Dimensions,
} from './canvasTypes';
import { isCanvasAnyLine, isCanvasMaskLine } from './canvasTypes';
import { CANVAS_GRID_SIZE_FINE } from './constants';

/**
 * The maximum history length to keep in the past/future layer states.
 */
const MAX_HISTORY = 128;

export const initialLayerState: CanvasLayerState = {
  objects: [],
  stagingArea: {
    images: [],
    selectedImageIndex: -1,
  },
};

export const initialCanvasState: CanvasState = {
  _version: 1,
  boundingBoxCoordinates: { x: 0, y: 0 },
  boundingBoxDimensions: { width: 512, height: 512 },
  boundingBoxPreviewFill: { r: 0, g: 0, b: 0, a: 0.5 },
  boundingBoxScaleMethod: 'auto',
  brushColor: { r: 90, g: 90, b: 255, a: 1 },
  brushSize: 50,
  colorPickerColor: { r: 90, g: 90, b: 255, a: 1 },
  futureLayerStates: [],
  isMaskEnabled: true,
  layer: 'base',
  layerState: initialLayerState,
  maskColor: { r: 255, g: 90, b: 90, a: 1 },
  pastLayerStates: [],
  scaledBoundingBoxDimensions: { width: 512, height: 512 },
  shouldAntialias: true,
  shouldAutoSave: false,
  shouldCropToBoundingBoxOnSave: false,
  shouldDarkenOutsideBoundingBox: false,
  shouldLockBoundingBox: false,
  shouldPreserveMaskedArea: false,
  shouldRestrictStrokesToBox: true,
  shouldShowBoundingBox: true,
  shouldShowCanvasDebugInfo: false,
  shouldShowGrid: true,
  shouldShowIntermediates: true,
  shouldShowStagingImage: true,
  shouldShowStagingOutline: true,
  shouldSnapToGrid: true,
  stageCoordinates: { x: 0, y: 0 },
  stageDimensions: { width: 0, height: 0 },
  stageScale: 1,
  aspectRatio: {
    id: '1:1',
    value: 1,
    isLocked: false,
  },
};

const setBoundingBoxDimensionsReducer = (
  state: CanvasState,
  payload: Partial<Dimensions>,
  optimalDimension: number
) => {
  const boundingBoxDimensions = payload;
  const newDimensions = {
    ...state.boundingBoxDimensions,
    ...boundingBoxDimensions,
  };
  state.boundingBoxDimensions = newDimensions;
  if (state.boundingBoxScaleMethod === 'auto') {
    const scaledDimensions = getScaledBoundingBoxDimensions(newDimensions, optimalDimension);
    state.scaledBoundingBoxDimensions = scaledDimensions;
  }
};

export const canvasSlice = createSlice({
  name: 'canvas',
  initialState: initialCanvasState,
  reducers: {
    setLayer: (state, action: PayloadAction<CanvasLayer>) => {
      state.layer = action.payload;
    },
    setMaskColor: (state, action: PayloadAction<RgbaColor>) => {
      state.maskColor = action.payload;
    },
    setBrushColor: (state, action: PayloadAction<RgbaColor>) => {
      state.brushColor = action.payload;
    },
    setBrushSize: (state, action: PayloadAction<number>) => {
      state.brushSize = action.payload;
    },
    clearMask: (state) => {
      state.pastLayerStates.push(cloneDeep(state.layerState));
      state.layerState.objects = state.layerState.objects.filter((obj) => !isCanvasMaskLine(obj));
      state.futureLayerStates = [];
      state.shouldPreserveMaskedArea = false;
    },
    toggleShouldInvertMask: (state) => {
      state.shouldPreserveMaskedArea = !state.shouldPreserveMaskedArea;
    },
    toggleShouldShowMask: (state) => {
      state.isMaskEnabled = !state.isMaskEnabled;
    },
    setShouldPreserveMaskedArea: (state, action: PayloadAction<boolean>) => {
      state.shouldPreserveMaskedArea = action.payload;
    },
    setIsMaskEnabled: (state, action: PayloadAction<boolean>) => {
      state.isMaskEnabled = action.payload;
      state.layer = action.payload ? 'mask' : 'base';
    },
    setInitialCanvasImage: {
      reducer: (state, action: PayloadActionWithOptimalDimension<ImageDTO>) => {
        const { width, height, image_name } = action.payload;
        const { optimalDimension } = action.meta;
        const { stageDimensions } = state;

        const newBoundingBoxDimensions = {
          width: roundDownToMultiple(clamp(width, CANVAS_GRID_SIZE_FINE, optimalDimension), CANVAS_GRID_SIZE_FINE),
          height: roundDownToMultiple(clamp(height, CANVAS_GRID_SIZE_FINE, optimalDimension), CANVAS_GRID_SIZE_FINE),
        };

        const newBoundingBoxCoordinates = {
          x: roundToMultiple(width / 2 - newBoundingBoxDimensions.width / 2, CANVAS_GRID_SIZE_FINE),
          y: roundToMultiple(height / 2 - newBoundingBoxDimensions.height / 2, CANVAS_GRID_SIZE_FINE),
        };

        if (state.boundingBoxScaleMethod === 'auto') {
          const scaledDimensions = getScaledBoundingBoxDimensions(newBoundingBoxDimensions, optimalDimension);
          state.scaledBoundingBoxDimensions = scaledDimensions;
        }

        state.boundingBoxDimensions = newBoundingBoxDimensions;
        state.boundingBoxCoordinates = newBoundingBoxCoordinates;

        state.pastLayerStates.push(cloneDeep(state.layerState));

        state.layerState = {
          ...cloneDeep(initialLayerState),
          objects: [
            {
              kind: 'image',
              layer: 'base',
              x: 0,
              y: 0,
              width,
              height,
              imageName: image_name,
            },
          ],
        };
        state.futureLayerStates = [];

        const newScale = calculateScale(
          stageDimensions.width,
          stageDimensions.height,
          width,
          height,
          STAGE_PADDING_PERCENTAGE
        );

        const newCoordinates = calculateCoordinates(
          stageDimensions.width,
          stageDimensions.height,
          0,
          0,
          width,
          height,
          newScale
        );
        state.stageScale = newScale;
        state.stageCoordinates = newCoordinates;
      },
      prepare: (payload: ImageDTO, optimalDimension: number) => ({
        payload,
        meta: {
          optimalDimension,
        },
      }),
    },
    setBoundingBoxCoordinates: (state, action: PayloadAction<Vector2d>) => {
      state.boundingBoxCoordinates = floorCoordinates(action.payload);
    },
    setStageCoordinates: (state, action: PayloadAction<Vector2d>) => {
      state.stageCoordinates = action.payload;
    },
    setBoundingBoxPreviewFill: (state, action: PayloadAction<RgbaColor>) => {
      state.boundingBoxPreviewFill = action.payload;
    },
    setStageScale: (state, action: PayloadAction<number>) => {
      state.stageScale = action.payload;
    },
    setShouldDarkenOutsideBoundingBox: (state, action: PayloadAction<boolean>) => {
      state.shouldDarkenOutsideBoundingBox = action.payload;
    },
    clearCanvasHistory: (state) => {
      state.pastLayerStates = [];
      state.futureLayerStates = [];
    },
    setShouldLockBoundingBox: (state, action: PayloadAction<boolean>) => {
      state.shouldLockBoundingBox = action.payload;
    },
    toggleShouldLockBoundingBox: (state) => {
      state.shouldLockBoundingBox = !state.shouldLockBoundingBox;
    },
    setShouldShowBoundingBox: (state, action: PayloadAction<boolean>) => {
      state.shouldShowBoundingBox = action.payload;
    },
    stagingAreaInitialized: (
      state,
      action: PayloadAction<{
        boundingBox: IRect;
      }>
    ) => {
      const { boundingBox } = action.payload;

      state.layerState.stagingArea = {
        boundingBox,
        images: [],
        selectedImageIndex: -1,
      };
    },
    addImageToStagingArea: (state, action: PayloadAction<ImageDTO>) => {
      const image = action.payload;

      if (!image || !state.layerState.stagingArea.boundingBox) {
        return;
      }

      state.pastLayerStates.push(cloneDeep(state.layerState));

      if (state.pastLayerStates.length > MAX_HISTORY) {
        state.pastLayerStates.shift();
      }

      state.layerState.stagingArea.images.push({
        kind: 'image',
        layer: 'base',
        ...state.layerState.stagingArea.boundingBox,
        imageName: image.image_name,
      });

      state.layerState.stagingArea.selectedImageIndex = state.layerState.stagingArea.images.length - 1;

      state.futureLayerStates = [];
    },
    discardStagedImages: (state) => {
      state.pastLayerStates.push(cloneDeep(state.layerState));

      if (state.pastLayerStates.length > MAX_HISTORY) {
        state.pastLayerStates.shift();
      }

      state.layerState.stagingArea = cloneDeep(cloneDeep(initialLayerState)).stagingArea;

      state.futureLayerStates = [];
      state.shouldShowStagingOutline = true;
      state.shouldShowStagingImage = true;
    },
    addFillRect: (state) => {
      const { boundingBoxCoordinates, boundingBoxDimensions, brushColor } = state;

      state.pastLayerStates.push(cloneDeep(state.layerState));

      if (state.pastLayerStates.length > MAX_HISTORY) {
        state.pastLayerStates.shift();
      }

      state.layerState.objects.push({
        kind: 'fillRect',
        layer: 'base',
        ...boundingBoxCoordinates,
        ...boundingBoxDimensions,
        color: brushColor,
      });

      state.futureLayerStates = [];
    },
    addEraseRect: (state) => {
      const { boundingBoxCoordinates, boundingBoxDimensions } = state;

      state.pastLayerStates.push(cloneDeep(state.layerState));

      if (state.pastLayerStates.length > MAX_HISTORY) {
        state.pastLayerStates.shift();
      }

      state.layerState.objects.push({
        kind: 'eraseRect',
        layer: 'base',
        ...boundingBoxCoordinates,
        ...boundingBoxDimensions,
      });

      state.futureLayerStates = [];
    },
    addLine: (state, action: PayloadAction<{ points: number[]; tool: CanvasTool }>) => {
      const { layer, brushColor, brushSize, shouldRestrictStrokesToBox } = state;
      const { points, tool } = action.payload;

      if (tool === 'move' || tool === 'colorPicker') {
        return;
      }

      const newStrokeWidth = brushSize / 2;

      // set & then spread this to only conditionally add the "color" key
      const newColor = layer === 'base' && tool === 'brush' ? { color: brushColor } : {};

      state.pastLayerStates.push(cloneDeep(state.layerState));

      if (state.pastLayerStates.length > MAX_HISTORY) {
        state.pastLayerStates.shift();
      }

      const newLine: CanvasMaskLine | CanvasBaseLine = {
        kind: 'line',
        layer,
        tool,
        strokeWidth: newStrokeWidth,
        points,
        ...newColor,
      };

      if (shouldRestrictStrokesToBox) {
        newLine.clip = {
          ...state.boundingBoxCoordinates,
          ...state.boundingBoxDimensions,
        };
      }

      state.layerState.objects.push(newLine);

      state.futureLayerStates = [];
    },
    addPointToCurrentLine: (state, action: PayloadAction<number[]>) => {
      const lastLine = state.layerState.objects.findLast(isCanvasAnyLine);

      if (!lastLine) {
        return;
      }

      lastLine.points.push(...action.payload);
    },
    undo: (state) => {
      const targetState = state.pastLayerStates.pop();

      if (!targetState) {
        return;
      }

      state.futureLayerStates.unshift(cloneDeep(state.layerState));

      if (state.futureLayerStates.length > MAX_HISTORY) {
        state.futureLayerStates.pop();
      }

      state.layerState = targetState;
    },
    redo: (state) => {
      const targetState = state.futureLayerStates.shift();

      if (!targetState) {
        return;
      }

      state.pastLayerStates.push(cloneDeep(state.layerState));

      if (state.pastLayerStates.length > MAX_HISTORY) {
        state.pastLayerStates.shift();
      }

      state.layerState = targetState;
    },
    setShouldShowGrid: (state, action: PayloadAction<boolean>) => {
      state.shouldShowGrid = action.payload;
    },
    setShouldSnapToGrid: (state, action: PayloadAction<boolean>) => {
      state.shouldSnapToGrid = action.payload;
    },
    setShouldAutoSave: (state, action: PayloadAction<boolean>) => {
      state.shouldAutoSave = action.payload;
    },
    setShouldShowIntermediates: (state, action: PayloadAction<boolean>) => {
      state.shouldShowIntermediates = action.payload;
    },
    resetCanvas: (state) => {
      state.pastLayerStates.push(cloneDeep(state.layerState));
      state.layerState = cloneDeep(initialLayerState);
      state.futureLayerStates = [];
      state.boundingBoxCoordinates = {
        ...initialCanvasState.boundingBoxCoordinates,
      };
      state.boundingBoxDimensions = {
        ...initialCanvasState.boundingBoxDimensions,
      };
      state.stageScale = calculateScale(
        state.stageDimensions.width,
        state.stageDimensions.height,
        state.boundingBoxDimensions.width,
        state.boundingBoxDimensions.height,
        STAGE_PADDING_PERCENTAGE
      );
      state.stageCoordinates = calculateCoordinates(
        state.stageDimensions.width,
        state.stageDimensions.height,
        0,
        0,
        state.boundingBoxDimensions.width,
        state.boundingBoxDimensions.height,
        1
      );
    },
    canvasResized: (state, action: PayloadAction<{ width: number; height: number }>) => {
      state.stageDimensions = {
        width: Math.floor(action.payload.width),
        height: Math.floor(action.payload.height),
      };
    },
    resetCanvasView: (
      state,
      action: PayloadAction<{
        contentRect: IRect;
        shouldScaleTo1?: boolean;
      }>
    ) => {
      const { contentRect, shouldScaleTo1 } = action.payload;
      const {
        stageDimensions: { width: stageWidth, height: stageHeight },
      } = state;

      const newScale = shouldScaleTo1
        ? 1
        : calculateScale(
            stageWidth,
            stageHeight,
            contentRect.width || state.boundingBoxDimensions.width,
            contentRect.height || state.boundingBoxDimensions.height,
            STAGE_PADDING_PERCENTAGE
          );

      const newCoordinates = calculateCoordinates(
        stageWidth,
        stageHeight,
        contentRect.x || state.boundingBoxCoordinates.x,
        contentRect.y || state.boundingBoxCoordinates.y,
        contentRect.width || state.boundingBoxDimensions.width,
        contentRect.height || state.boundingBoxDimensions.height,
        newScale
      );

      state.stageScale = newScale;
      state.stageCoordinates = newCoordinates;
    },
    nextStagingAreaImage: (state) => {
      if (!state.layerState.stagingArea.images.length) {
        return;
      }

      const nextIndex = state.layerState.stagingArea.selectedImageIndex + 1;
      const lastIndex = state.layerState.stagingArea.images.length - 1;

      state.layerState.stagingArea.selectedImageIndex = nextIndex > lastIndex ? 0 : nextIndex;
    },
    prevStagingAreaImage: (state) => {
      if (!state.layerState.stagingArea.images.length) {
        return;
      }

      const prevIndex = state.layerState.stagingArea.selectedImageIndex - 1;
      const lastIndex = state.layerState.stagingArea.images.length - 1;

      state.layerState.stagingArea.selectedImageIndex = prevIndex < 0 ? lastIndex : prevIndex;
    },
    commitStagingAreaImage: (state) => {
      if (!state.layerState.stagingArea.images.length) {
        return;
      }

      const { images, selectedImageIndex } = state.layerState.stagingArea;

      state.pastLayerStates.push(cloneDeep(state.layerState));

      if (state.pastLayerStates.length > MAX_HISTORY) {
        state.pastLayerStates.shift();
      }

      const imageToCommit = images[selectedImageIndex];

      if (imageToCommit) {
        state.layerState.objects.push({
          ...imageToCommit,
        });
      }
      state.layerState.stagingArea = cloneDeep(initialLayerState).stagingArea;

      state.futureLayerStates = [];
      state.shouldShowStagingOutline = true;
      state.shouldShowStagingImage = true;
    },
    setBoundingBoxScaleMethod: {
      reducer: (state, action: PayloadActionWithOptimalDimension<BoundingBoxScaleMethod>) => {
        const boundingBoxScaleMethod = action.payload;
        const { optimalDimension } = action.meta;
        state.boundingBoxScaleMethod = boundingBoxScaleMethod;

        if (boundingBoxScaleMethod === 'auto') {
          const scaledDimensions = getScaledBoundingBoxDimensions(state.boundingBoxDimensions, optimalDimension);
          state.scaledBoundingBoxDimensions = scaledDimensions;
        }
      },
      prepare: (payload: BoundingBoxScaleMethod, optimalDimension: number) => ({
        payload,
        meta: {
          optimalDimension,
        },
      }),
    },
    setScaledBoundingBoxDimensions: (state, action: PayloadAction<Partial<Dimensions>>) => {
      state.scaledBoundingBoxDimensions = {
        ...state.scaledBoundingBoxDimensions,
        ...action.payload,
      };
    },
    setBoundingBoxDimensions: {
      reducer: (state, action: PayloadActionWithOptimalDimension<Partial<Dimensions>>) => {
        setBoundingBoxDimensionsReducer(state, action.payload, action.meta.optimalDimension);
      },
      prepare: (payload: Partial<Dimensions>, optimalDimension: number) => ({
        payload,
        meta: {
          optimalDimension,
        },
      }),
    },
    scaledBoundingBoxDimensionsReset: {
      reducer: (state, action: PayloadActionWithOptimalDimension) => {
        const scaledDimensions = getScaledBoundingBoxDimensions(
          state.boundingBoxDimensions,
          action.meta.optimalDimension
        );
        state.scaledBoundingBoxDimensions = scaledDimensions;
      },
      prepare: (payload: void, optimalDimension: number) => ({
        payload: undefined,
        meta: { optimalDimension },
      }),
    },
    setShouldShowStagingImage: (state, action: PayloadAction<boolean>) => {
      state.shouldShowStagingImage = action.payload;
    },
    setShouldShowStagingOutline: (state, action: PayloadAction<boolean>) => {
      state.shouldShowStagingOutline = action.payload;
    },
    setShouldShowCanvasDebugInfo: (state, action: PayloadAction<boolean>) => {
      state.shouldShowCanvasDebugInfo = action.payload;
    },
    setShouldRestrictStrokesToBox: (state, action: PayloadAction<boolean>) => {
      state.shouldRestrictStrokesToBox = action.payload;
    },
    setShouldAntialias: (state, action: PayloadAction<boolean>) => {
      state.shouldAntialias = action.payload;
    },
    setShouldCropToBoundingBoxOnSave: (state, action: PayloadAction<boolean>) => {
      state.shouldCropToBoundingBoxOnSave = action.payload;
    },
    setColorPickerColor: (state, action: PayloadAction<RgbaColor>) => {
      state.colorPickerColor = action.payload;
    },
    commitColorPickerColor: (state) => {
      state.brushColor = {
        ...state.colorPickerColor,
        a: state.brushColor.a,
      };
    },
    setMergedCanvas: (state, action: PayloadAction<CanvasImage>) => {
      state.pastLayerStates.push(cloneDeep(state.layerState));

      state.futureLayerStates = [];

      state.layerState.objects = [action.payload];
    },
    aspectRatioChanged: (state, action: PayloadAction<AspectRatioState>) => {
      state.aspectRatio = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(modelChanged, (state, action) => {
      if (action.meta.previousModel?.base_model === action.payload?.base_model) {
        // The base model hasn't changed, we don't need to optimize the size
        return;
      }
      const optimalDimension = getOptimalDimension(action.payload);
      const { width, height } = state.boundingBoxDimensions;
      if (getIsSizeOptimal(width, height, optimalDimension)) {
        return;
      }
      setBoundingBoxDimensionsReducer(
        state,
        {
          width,
          height,
        },
        optimalDimension
      );
    });
  },
});

export const {
  addEraseRect,
  addFillRect,
  addImageToStagingArea,
  addLine,
  addPointToCurrentLine,
  clearCanvasHistory,
  clearMask,
  commitColorPickerColor,
  commitStagingAreaImage,
  discardStagedImages,
  nextStagingAreaImage,
  prevStagingAreaImage,
  redo,
  resetCanvas,
  resetCanvasView,
  setBoundingBoxCoordinates,
  setBoundingBoxDimensions,
  setBoundingBoxPreviewFill,
  setBoundingBoxScaleMethod,
  setBrushColor,
  setBrushSize,
  setColorPickerColor,
  setInitialCanvasImage,
  setIsMaskEnabled,
  setLayer,
  setMaskColor,
  setMergedCanvas,
  setShouldAutoSave,
  setShouldCropToBoundingBoxOnSave,
  setShouldDarkenOutsideBoundingBox,
  setShouldLockBoundingBox,
  setShouldPreserveMaskedArea,
  setShouldShowBoundingBox,
  setShouldShowCanvasDebugInfo,
  setShouldShowGrid,
  setShouldShowIntermediates,
  setShouldShowStagingImage,
  setShouldShowStagingOutline,
  setShouldSnapToGrid,
  setStageCoordinates,
  setStageScale,
  toggleShouldLockBoundingBox,
  undo,
  setScaledBoundingBoxDimensions,
  setShouldRestrictStrokesToBox,
  stagingAreaInitialized,
  setShouldAntialias,
  canvasResized,
  aspectRatioChanged,
  scaledBoundingBoxDimensionsReset,
} = canvasSlice.actions;

export const selectCanvasSlice = (state: RootState) => state.canvas;

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export const migrateCanvasState = (state: any): any => {
  if (!('_version' in state)) {
    state._version = 1;
    state.aspectRatio = initialAspectRatioState;
  }
  return state;
};

export const canvasPersistConfig: PersistConfig<CanvasState> = {
  name: canvasSlice.name,
  initialState: initialCanvasState,
  migrate: migrateCanvasState,
  persistDenylist: [],
};

export const matchAnyStagingAreaDismissed = isAnyOf(commitStagingAreaImage, discardStagedImages);
