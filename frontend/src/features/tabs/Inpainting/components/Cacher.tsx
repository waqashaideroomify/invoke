import { createSelector } from '@reduxjs/toolkit';
import { useEffect, useLayoutEffect } from 'react';
import { RootState, useAppSelector } from '../../../../app/store';
import { maskLayerRef, stageRef } from '../InpaintingCanvas';
import { InpaintingState } from '../inpaintingSlice';

/**
 * Konva's cache() method basically rasterizes an object/canvas.
 * This is needed to rasterize the mask, before setting the opacity.
 * If we do not cache the maskLayer, the brush strokes will have opacity
 * set individually.
 *
 * This logical component simply uses useLayoutEffect() to synchronously
 * cache the mask layer every time something that changes how it should draw
 * is changed.
 */
const Cacher = () => {
  const {
    tool,
    lines,
    cursorPosition,
    brushSize,
    stageDimensions: { width, height },
    maskColor,
    shouldInvertMask,
    shouldShowMask,
    shouldShowBrushPreview,
    shouldShowCheckboardTransparency,
    imageToInpaint,
    shouldShowBrush,
    shouldShowBoundingBoxFill,
    shouldLockBoundingBox,
    stageScale,
    pastLines,
    futureLines,
    doesCanvasNeedScaling,
    isDrawing,
    isTransformingBoundingBox,
    isMovingBoundingBox,
    shouldShowBoundingBox,
    stageCoordinates: { x, y },
  } = useAppSelector((state: RootState) => state.inpainting);

  useLayoutEffect(() => {
    if (!maskLayerRef.current) return;
    maskLayerRef.current.clearCache();
    maskLayerRef.current.cache();
    console.log(maskLayerRef.current.getClientRect())
  }, [
    lines,
    cursorPosition,
    width,
    height,
    tool,
    brushSize,
    maskColor,
    shouldInvertMask,
    shouldShowMask,
    shouldShowBrushPreview,
    shouldShowCheckboardTransparency,
    imageToInpaint,
    shouldShowBrush,
    shouldShowBoundingBoxFill,
    shouldShowBoundingBox,
    shouldLockBoundingBox,
    stageScale,
    pastLines,
    futureLines,
    doesCanvasNeedScaling,
    isDrawing,
    isTransformingBoundingBox,
    isMovingBoundingBox,
    x,
    y,
  ]);

  /**
   * Hack to cache the mask layer after the canvas is ready.
   */
  useEffect(() => {
    const intervalId = window.setTimeout(() => {
      if (!maskLayerRef.current) return;
      const { width, height } = maskLayerRef.current.size();
      if (!width || !height) return;
      maskLayerRef.current.cache();
    }, 0);

    return () => {
      window.clearTimeout(intervalId);
    };
  });

  return null;
};

export default Cacher;
