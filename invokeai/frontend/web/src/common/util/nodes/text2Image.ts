import { v4 as uuidv4 } from 'uuid';
import { RootState } from 'app/store';
import { TextToImageInvocation } from 'services/api';

export const buildTxt2ImgNode = (
  state: RootState
): Record<string, TextToImageInvocation> => {
  const nodeId = uuidv4();
  const { generation, system, models } = state;

  const { selectedModelName } = models;

  const {
    prompt,
    seed,
    steps,
    width,
    height,
    cfgScale: cfg_scale,
    sampler,
    seamless,
    shouldRandomizeSeed,
  } = generation;

  // missing fields in TextToImageInvocation: strength, hires_fix
  const textToImageNode: TextToImageInvocation = {
    id: nodeId,
    type: 'txt2img',
    prompt,
    steps,
    width,
    height,
    cfg_scale,
    scheduler: sampler as TextToImageInvocation['scheduler'],
    seamless,
    model: selectedModelName,
    progress_images: true,
  };

  if (!shouldRandomizeSeed) {
    textToImageNode.seed = seed;
  }

  return {
    [nodeId]: textToImageNode,
  };
};
