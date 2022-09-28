import { createSelector } from '@reduxjs/toolkit';
import { isEqual } from 'lodash';

import * as InvokeAI from '../../app/invokeai';

import { useAppDispatch, useAppSelector } from '../../app/store';
import { RootState } from '../../app/store';
import {
  setAllParameters,
  setInitialImagePath,
  setSeed,
} from '../options/optionsSlice';
import DeleteImageModal from './DeleteImageModal';
import { SystemState } from '../system/systemSlice';
import SDButton from '../../common/components/SDButton';
import { runESRGAN, runGFPGAN } from '../../app/socketio/actions';
import SDIconButton from '../../common/components/SDIconButton';
import { MdDelete, MdFace, MdHd, MdImage, MdInfo } from 'react-icons/md';

const systemSelector = createSelector(
  (state: RootState) => state.system,
  (system: SystemState) => {
    return {
      isProcessing: system.isProcessing,
      isConnected: system.isConnected,
      isGFPGANAvailable: system.isGFPGANAvailable,
      isESRGANAvailable: system.isESRGANAvailable,
    };
  },
  {
    memoizeOptions: {
      resultEqualityCheck: isEqual,
    },
  }
);

type CurrentImageButtonsProps = {
  image: InvokeAI.Image;
  shouldShowImageDetails: boolean;
  setShouldShowImageDetails: (b: boolean) => void;
};

/**
 * Row of buttons for common actions:
 * Use as init image, use all params, use seed, upscale, fix faces, details, delete.
 */
const CurrentImageButtons = ({
  image,
  shouldShowImageDetails,
  setShouldShowImageDetails,
}: CurrentImageButtonsProps) => {
  const dispatch = useAppDispatch();

  const { intermediateImage } = useAppSelector(
    (state: RootState) => state.gallery
  );

  const { upscalingLevel, gfpganStrength } = useAppSelector(
    (state: RootState) => state.options
  );

  const { isProcessing, isConnected, isGFPGANAvailable, isESRGANAvailable } =
    useAppSelector(systemSelector);

  const handleClickUseAsInitialImage = () =>
    dispatch(setInitialImagePath(image.url));

  const handleClickUseAllParameters = () =>
    dispatch(setAllParameters(image.metadata));

  // Non-null assertion: this button is disabled if there is no seed.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const handleClickUseSeed = () => dispatch(setSeed(image.metadata.image.seed));
  const handleClickUpscale = () => dispatch(runESRGAN(image));

  const handleClickFixFaces = () => dispatch(runGFPGAN(image));

  const handleClickShowImageDetails = () =>
    setShouldShowImageDetails(!shouldShowImageDetails);

  return (
    <div className="current-image-options">
      <SDIconButton
        icon={<MdImage />}
        tooltip="Use As Initial Image"
        aria-label="Use As Initial Image"
        onClick={handleClickUseAsInitialImage}
      />

      <SDButton
        label="Use All"
        isDisabled={
          !['txt2img', 'img2img'].includes(image?.metadata?.image?.type)
        }
        onClick={handleClickUseAllParameters}
      />

      <SDButton
        label="Use Seed"
        isDisabled={!image?.metadata?.image?.seed}
        onClick={handleClickUseSeed}
      />

      <SDIconButton
        icon={<MdHd />}
        tooltip="Upscale"
        aria-label="Upscale"
        isDisabled={
          !isESRGANAvailable ||
          Boolean(intermediateImage) ||
          !(isConnected && !isProcessing) ||
          !upscalingLevel
        }
        onClick={handleClickUpscale}
      />
      <SDIconButton
        icon={<MdFace />}
        tooltip="Restore Faces"
        aria-label="Restore Faces"
        isDisabled={
          !isGFPGANAvailable ||
          Boolean(intermediateImage) ||
          !(isConnected && !isProcessing) ||
          !gfpganStrength
        }
        onClick={handleClickFixFaces}
      />
      <SDIconButton
        icon={<MdInfo />}
        tooltip="Details"
        aria-label="Details"
        onClick={handleClickShowImageDetails}
      />
      <DeleteImageModal image={image}>
        <SDIconButton
          icon={<MdDelete />}
          tooltip="Delete Image"
          aria-label="Delete Image"
          isDisabled={Boolean(intermediateImage)}
        />
      </DeleteImageModal>
    </div>
  );
};

export default CurrentImageButtons;
