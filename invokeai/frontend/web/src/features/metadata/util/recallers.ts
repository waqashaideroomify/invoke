import { getStore } from 'app/store/nanostores/store';
import {
  controlAdapterRecalled,
  controlNetsReset,
  ipAdaptersReset,
  t2iAdaptersReset,
} from 'features/controlAdapters/store/controlAdaptersSlice';
import {
  allLayersDeleted,
  caLayerRecalled,
  heightChanged,
  iiLayerRecalled,
  ipaLayerRecalled,
  negativePrompt2Changed,
  negativePromptChanged,
  positivePrompt2Changed,
  positivePromptChanged,
  rgLayerRecalled,
  widthChanged,
} from 'features/controlLayers/store/controlLayersSlice';
import type { Layer } from 'features/controlLayers/store/types';
import { setHrfEnabled, setHrfMethod, setHrfStrength } from 'features/hrf/store/hrfSlice';
import type { LoRA } from 'features/lora/store/loraSlice';
import { loraRecalled, lorasReset } from 'features/lora/store/loraSlice';
import type {
  ControlNetConfigMetadata,
  IPAdapterConfigMetadata,
  MetadataRecallFunc,
  T2IAdapterConfigMetadata,
} from 'features/metadata/types';
import { modelSelected } from 'features/parameters/store/actions';
import {
  setCfgRescaleMultiplier,
  setCfgScale,
  setImg2imgStrength,
  setScheduler,
  setSeed,
  setSteps,
  vaeSelected,
} from 'features/parameters/store/generationSlice';
import type {
  ParameterCFGRescaleMultiplier,
  ParameterCFGScale,
  ParameterHeight,
  ParameterHRFEnabled,
  ParameterHRFMethod,
  ParameterModel,
  ParameterNegativePrompt,
  ParameterNegativeStylePromptSDXL,
  ParameterPositivePrompt,
  ParameterPositiveStylePromptSDXL,
  ParameterScheduler,
  ParameterSDXLRefinerModel,
  ParameterSDXLRefinerNegativeAestheticScore,
  ParameterSDXLRefinerPositiveAestheticScore,
  ParameterSDXLRefinerStart,
  ParameterSeed,
  ParameterSteps,
  ParameterStrength,
  ParameterVAEModel,
  ParameterWidth,
} from 'features/parameters/types/parameterSchemas';
import {
  refinerModelChanged,
  setRefinerCFGScale,
  setRefinerNegativeAestheticScore,
  setRefinerPositiveAestheticScore,
  setRefinerScheduler,
  setRefinerStart,
  setRefinerSteps,
} from 'features/sdxl/store/sdxlSlice';

const recallPositivePrompt: MetadataRecallFunc<ParameterPositivePrompt> = (positivePrompt) => {
  getStore().dispatch(positivePromptChanged(positivePrompt));
};

const recallNegativePrompt: MetadataRecallFunc<ParameterNegativePrompt> = (negativePrompt) => {
  getStore().dispatch(negativePromptChanged(negativePrompt));
};

const recallSDXLPositiveStylePrompt: MetadataRecallFunc<ParameterPositiveStylePromptSDXL> = (positiveStylePrompt) => {
  getStore().dispatch(positivePrompt2Changed(positiveStylePrompt));
};

const recallSDXLNegativeStylePrompt: MetadataRecallFunc<ParameterNegativeStylePromptSDXL> = (negativeStylePrompt) => {
  getStore().dispatch(negativePrompt2Changed(negativeStylePrompt));
};

const recallSeed: MetadataRecallFunc<ParameterSeed> = (seed) => {
  getStore().dispatch(setSeed(seed));
};

const recallCFGScale: MetadataRecallFunc<ParameterCFGScale> = (cfgScale) => {
  getStore().dispatch(setCfgScale(cfgScale));
};

const recallCFGRescaleMultiplier: MetadataRecallFunc<ParameterCFGRescaleMultiplier> = (cfgRescaleMultiplier) => {
  getStore().dispatch(setCfgRescaleMultiplier(cfgRescaleMultiplier));
};

const recallScheduler: MetadataRecallFunc<ParameterScheduler> = (scheduler) => {
  getStore().dispatch(setScheduler(scheduler));
};

const setSizeOptions = { updateAspectRatio: true, clamp: true };

const recallWidth: MetadataRecallFunc<ParameterWidth> = (width) => {
  getStore().dispatch(widthChanged({ width, ...setSizeOptions }));
};

const recallHeight: MetadataRecallFunc<ParameterHeight> = (height) => {
  getStore().dispatch(heightChanged({ height, ...setSizeOptions }));
};

const recallSteps: MetadataRecallFunc<ParameterSteps> = (steps) => {
  getStore().dispatch(setSteps(steps));
};

const recallStrength: MetadataRecallFunc<ParameterStrength> = (strength) => {
  getStore().dispatch(setImg2imgStrength(strength));
};

const recallHRFEnabled: MetadataRecallFunc<ParameterHRFEnabled> = (hrfEnabled) => {
  getStore().dispatch(setHrfEnabled(hrfEnabled));
};

const recallHRFStrength: MetadataRecallFunc<ParameterStrength> = (hrfStrength) => {
  getStore().dispatch(setHrfStrength(hrfStrength));
};

const recallHRFMethod: MetadataRecallFunc<ParameterHRFMethod> = (hrfMethod) => {
  getStore().dispatch(setHrfMethod(hrfMethod));
};

const recallRefinerSteps: MetadataRecallFunc<ParameterSteps> = (refinerSteps) => {
  getStore().dispatch(setRefinerSteps(refinerSteps));
};

const recallRefinerCFGScale: MetadataRecallFunc<ParameterCFGScale> = (refinerCFGScale) => {
  getStore().dispatch(setRefinerCFGScale(refinerCFGScale));
};

const recallRefinerScheduler: MetadataRecallFunc<ParameterScheduler> = (refinerScheduler) => {
  getStore().dispatch(setRefinerScheduler(refinerScheduler));
};

const recallRefinerPositiveAestheticScore: MetadataRecallFunc<ParameterSDXLRefinerPositiveAestheticScore> = (
  refinerPositiveAestheticScore
) => {
  getStore().dispatch(setRefinerPositiveAestheticScore(refinerPositiveAestheticScore));
};

const recallRefinerNegativeAestheticScore: MetadataRecallFunc<ParameterSDXLRefinerNegativeAestheticScore> = (
  refinerNegativeAestheticScore
) => {
  getStore().dispatch(setRefinerNegativeAestheticScore(refinerNegativeAestheticScore));
};

const recallRefinerStart: MetadataRecallFunc<ParameterSDXLRefinerStart> = (refinerStart) => {
  getStore().dispatch(setRefinerStart(refinerStart));
};

const recallModel: MetadataRecallFunc<ParameterModel> = (model) => {
  getStore().dispatch(modelSelected(model));
};

const recallRefinerModel: MetadataRecallFunc<ParameterSDXLRefinerModel> = (refinerModel) => {
  getStore().dispatch(refinerModelChanged(refinerModel));
};

const recallVAE: MetadataRecallFunc<ParameterVAEModel | null | undefined> = (vaeModel) => {
  if (!vaeModel) {
    getStore().dispatch(vaeSelected(null));
    return;
  }
  getStore().dispatch(vaeSelected(vaeModel));
};

const recallLoRA: MetadataRecallFunc<LoRA> = (lora) => {
  getStore().dispatch(loraRecalled(lora));
};

const recallAllLoRAs: MetadataRecallFunc<LoRA[]> = (loras) => {
  const { dispatch } = getStore();
  dispatch(lorasReset());
  if (!loras.length) {
    return;
  }
  loras.forEach((lora) => {
    dispatch(loraRecalled(lora));
  });
};

const recallControlNet: MetadataRecallFunc<ControlNetConfigMetadata> = (controlNet) => {
  getStore().dispatch(controlAdapterRecalled(controlNet));
};

const recallControlNets: MetadataRecallFunc<ControlNetConfigMetadata[]> = (controlNets) => {
  const { dispatch } = getStore();
  dispatch(controlNetsReset());
  if (!controlNets.length) {
    return;
  }
  controlNets.forEach((controlNet) => {
    dispatch(controlAdapterRecalled(controlNet));
  });
};

const recallT2IAdapter: MetadataRecallFunc<T2IAdapterConfigMetadata> = (t2iAdapter) => {
  getStore().dispatch(controlAdapterRecalled(t2iAdapter));
};

const recallT2IAdapters: MetadataRecallFunc<T2IAdapterConfigMetadata[]> = (t2iAdapters) => {
  const { dispatch } = getStore();
  dispatch(t2iAdaptersReset());
  if (!t2iAdapters.length) {
    return;
  }
  t2iAdapters.forEach((t2iAdapter) => {
    dispatch(controlAdapterRecalled(t2iAdapter));
  });
};

const recallIPAdapter: MetadataRecallFunc<IPAdapterConfigMetadata> = (ipAdapter) => {
  getStore().dispatch(controlAdapterRecalled(ipAdapter));
};

const recallIPAdapters: MetadataRecallFunc<IPAdapterConfigMetadata[]> = (ipAdapters) => {
  const { dispatch } = getStore();
  dispatch(ipAdaptersReset());
  if (!ipAdapters.length) {
    return;
  }
  ipAdapters.forEach((ipAdapter) => {
    dispatch(controlAdapterRecalled(ipAdapter));
  });
};

//#region Control Layers
const recallLayer: MetadataRecallFunc<Layer> = (layer) => {
  const { dispatch } = getStore();
  switch (layer.type) {
    case 'control_adapter_layer':
      dispatch(caLayerRecalled(layer));
      break;
    case 'ip_adapter_layer':
      dispatch(ipaLayerRecalled(layer));
      break;
    case 'regional_guidance_layer':
      dispatch(rgLayerRecalled(layer));
      break;
    case 'initial_image_layer':
      dispatch(iiLayerRecalled(layer));
      break;
  }
};

const recallLayers: MetadataRecallFunc<Layer[]> = (layers) => {
  const { dispatch } = getStore();
  dispatch(allLayersDeleted());
  for (const l of layers) {
    recallLayer(l);
  }
};

export const recallers = {
  positivePrompt: recallPositivePrompt,
  negativePrompt: recallNegativePrompt,
  sdxlPositiveStylePrompt: recallSDXLPositiveStylePrompt,
  sdxlNegativeStylePrompt: recallSDXLNegativeStylePrompt,
  seed: recallSeed,
  cfgScale: recallCFGScale,
  cfgRescaleMultiplier: recallCFGRescaleMultiplier,
  scheduler: recallScheduler,
  width: recallWidth,
  height: recallHeight,
  steps: recallSteps,
  strength: recallStrength,
  hrfEnabled: recallHRFEnabled,
  hrfStrength: recallHRFStrength,
  hrfMethod: recallHRFMethod,
  refinerSteps: recallRefinerSteps,
  refinerCFGScale: recallRefinerCFGScale,
  refinerScheduler: recallRefinerScheduler,
  refinerPositiveAestheticScore: recallRefinerPositiveAestheticScore,
  refinerNegativeAestheticScore: recallRefinerNegativeAestheticScore,
  refinerStart: recallRefinerStart,
  model: recallModel,
  refinerModel: recallRefinerModel,
  vae: recallVAE,
  lora: recallLoRA,
  loras: recallAllLoRAs,
  controlNets: recallControlNets,
  controlNet: recallControlNet,
  t2iAdapters: recallT2IAdapters,
  t2iAdapter: recallT2IAdapter,
  ipAdapters: recallIPAdapters,
  ipAdapter: recallIPAdapter,
  layer: recallLayer,
  layers: recallLayers,
} as const;
