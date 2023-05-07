import { createSelector } from '@reduxjs/toolkit';
import { RootState } from 'app/store/store';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { shiftKeyPressed } from 'features/ui/store/hotkeysSlice';
import {
  toggleGalleryPanel,
  toggleParametersPanel,
  togglePinGalleryPanel,
  togglePinParametersPanel,
} from 'features/ui/store/uiSlice';
import { isEqual } from 'lodash-es';
import { isHotkeyPressed, useHotkeys } from 'react-hotkeys-hook';

const globalHotkeysSelector = createSelector(
  (state: RootState) => state.hotkeys,
  (hotkeys) => {
    const { shift } = hotkeys;
    return { shift };
  },
  {
    memoizeOptions: {
      resultEqualityCheck: isEqual,
    },
  }
);

// TODO: Does not catch keypresses while focused in an input. Maybe there is a way?

export const useGlobalHotkeys = () => {
  const dispatch = useAppDispatch();
  const { shift } = useAppSelector(globalHotkeysSelector);

  useHotkeys(
    '*',
    () => {
      if (isHotkeyPressed('shift')) {
        !shift && dispatch(shiftKeyPressed(true));
      } else {
        shift && dispatch(shiftKeyPressed(false));
      }
    },
    { keyup: true, keydown: true },
    [shift]
  );

  useHotkeys('o', () => {
    dispatch(toggleParametersPanel());
  });

  useHotkeys(['shift+o'], () => {
    dispatch(togglePinParametersPanel());
  });

  useHotkeys('g', () => {
    dispatch(toggleGalleryPanel());
  });

  useHotkeys(['shift+g'], () => {
    dispatch(togglePinGalleryPanel());
  });
};
