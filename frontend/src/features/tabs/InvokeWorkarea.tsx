import { Tooltip } from '@chakra-ui/react';
import { createSelector } from '@reduxjs/toolkit';
import { ReactNode } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { VscSplitHorizontal } from 'react-icons/vsc';
import { RootState, useAppDispatch, useAppSelector } from 'app/store';
import ImageGallery from 'features/gallery/ImageGallery';
import { activeTabNameSelector } from 'features/options/optionsSelectors';
import {
  OptionsState,
  setShowDualDisplay,
} from 'features/options/optionsSlice';

const workareaSelector = createSelector(
  [(state: RootState) => state.options, activeTabNameSelector],
  (options: OptionsState, activeTabName) => {
    const { showDualDisplay, shouldPinOptionsPanel, isLightBoxOpen } = options;
    return {
      showDualDisplay,
      shouldPinOptionsPanel,
      activeTabName,
      isLightBoxOpen,
    };
  }
);

type InvokeWorkareaProps = {
  optionsPanel: ReactNode;
  children: ReactNode;
  styleClass?: string;
};

const InvokeWorkarea = (props: InvokeWorkareaProps) => {
  const dispatch = useAppDispatch();
  const { optionsPanel, children, styleClass } = props;
  const { showDualDisplay, activeTabName, isLightBoxOpen } =
    useAppSelector(workareaSelector);

  const handleDualDisplay = () => {
    dispatch(setShowDualDisplay(!showDualDisplay));
  };

  // Hotkeys
  // Toggle split view
  useHotkeys(
    'shift+j',
    () => {
      handleDualDisplay();
    },
    {
      enabled: activeTabName === 'inpainting',
    },
    [showDualDisplay]
  );

  return (
    <div
      className={
        styleClass ? `workarea-wrapper ${styleClass}` : `workarea-wrapper`
      }
    >
      <div className="workarea-main">
        {optionsPanel}
        <div className="workarea-children-wrapper">
          {children}
          {activeTabName === 'inpainting' && (
            <Tooltip label="Toggle Split View">
              <div
                className="workarea-split-button"
                data-selected={showDualDisplay}
                onClick={handleDualDisplay}
              >
                <VscSplitHorizontal />
              </div>
            </Tooltip>
          )}
        </div>

        {!isLightBoxOpen && <ImageGallery />}
      </div>
    </div>
  );
};

export default InvokeWorkarea;
