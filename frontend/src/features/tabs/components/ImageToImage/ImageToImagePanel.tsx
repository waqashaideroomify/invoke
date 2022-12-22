import { Feature } from 'app/features';
import FaceRestoreOptions from 'features/options/components/AdvancedOptions/FaceRestore/FaceRestoreOptions';
import FaceRestoreToggle from 'features/options/components/AdvancedOptions/FaceRestore/FaceRestoreToggle';
import ImageFit from 'features/options/components/AdvancedOptions/ImageToImage/ImageFit';
import ImageToImageStrength from 'features/options/components/AdvancedOptions/ImageToImage/ImageToImageStrength';
import ImageToImageOutputOptions from 'features/options/components/AdvancedOptions/Output/ImageToImageOutputOptions';
import SeedOptions from 'features/options/components/AdvancedOptions/Seed/SeedOptions';
import UpscaleOptions from 'features/options/components/AdvancedOptions/Upscale/UpscaleOptions';
import UpscaleToggle from 'features/options/components/AdvancedOptions/Upscale/UpscaleToggle';
import GenerateVariationsToggle from 'features/options/components/AdvancedOptions/Variations/GenerateVariations';
import VariationsOptions from 'features/options/components/AdvancedOptions/Variations/VariationsOptions';
import MainOptions from 'features/options/components/MainOptions/MainOptions';
import OptionsAccordion from 'features/options/components/OptionsAccordion';
import ProcessButtons from 'features/options/components/ProcessButtons/ProcessButtons';
import PromptInput from 'features/options/components/PromptInput/PromptInput';
import { setHiresFix } from 'features/options/store/optionsSlice';
import { useAppDispatch } from 'app/storeHooks';
import InvokeOptionsPanel from 'features/tabs/components/InvokeOptionsPanel';

export default function ImageToImagePanel() {
  const imageToImageAccordions = {
    seed: {
      header: 'Seed',
      feature: Feature.SEED,
      content: <SeedOptions />,
    },
    variations: {
      header: 'Variations',
      feature: Feature.VARIATIONS,
      content: <VariationsOptions />,
      additionalHeaderComponents: <GenerateVariationsToggle />,
    },
    face_restore: {
      header: 'Face Restoration',
      feature: Feature.FACE_CORRECTION,
      content: <FaceRestoreOptions />,
      additionalHeaderComponents: <FaceRestoreToggle />,
    },
    upscale: {
      header: 'Upscaling',
      feature: Feature.UPSCALE,
      content: <UpscaleOptions />,
      additionalHeaderComponents: <UpscaleToggle />,
    },
    other: {
      header: 'Other Options',
      feature: Feature.OTHER,
      content: <ImageToImageOutputOptions />,
    },
  };

  const dispatch = useAppDispatch();

  const handleChangeHiresFix = () => dispatch(setHiresFix(false));

  handleChangeHiresFix();

  return (
    <InvokeOptionsPanel>
      <PromptInput />
      <ProcessButtons />
      <MainOptions />
      <ImageToImageStrength
        label="Image To Image Strength"
        styleClass="main-option-block image-to-image-strength-main-option"
      />
      <ImageFit />
      <OptionsAccordion accordionInfo={imageToImageAccordions} />
    </InvokeOptionsPanel>
  );
}
