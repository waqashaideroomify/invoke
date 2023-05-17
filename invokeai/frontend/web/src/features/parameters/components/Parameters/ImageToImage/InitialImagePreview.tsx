import { Flex, Icon, Image } from '@chakra-ui/react';
import { createSelector } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import SelectImagePlaceholder from 'common/components/SelectImagePlaceholder';
import { useGetUrl } from 'common/util/getUrl';
import { clearInitialImage } from 'features/parameters/store/generationSlice';
import { addToast } from 'features/system/store/systemSlice';
import { DragEvent, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageType } from 'services/api';
import ImageMetadataOverlay from 'common/components/ImageMetadataOverlay';
import { generationSelector } from 'features/parameters/store/generationSelectors';
import { initialImageSelected } from 'features/parameters/store/actions';
import { defaultSelectorOptions } from 'app/store/util/defaultMemoizeOptions';
import ImageFallbackSpinner from 'features/gallery/components/ImageFallbackSpinner';
import { FaImage } from 'react-icons/fa';
import {
  receivedResultImagesPage,
  receivedUploadImagesPage,
} from '../../../../../services/thunks/gallery';
import configSlice from '../../../../system/store/configSlice';
import { configSelector } from '../../../../system/store/configSelectors';

const selector = createSelector(
  [generationSelector],
  (generation) => {
    const { initialImage } = generation;
    return {
      initialImage,
    };
  },
  defaultSelectorOptions
);

const InitialImagePreview = () => {
  const { initialImage } = useAppSelector(selector);
  const { shouldFetchImages } = useAppSelector(configSelector);
  const { getUrl } = useGetUrl();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const onError = () => {
    if (shouldFetchImages) {
      dispatch(
        addToast({
          title: 'Something went wrong, please refresh',
          status: 'error',
          isClosable: true,
        })
      );
    } else {
      dispatch(
        addToast({
          title: t('toast.parametersFailed'),
          description: t('toast.parametersFailedDesc'),
          status: 'error',
          isClosable: true,
        })
      );
      dispatch(clearInitialImage());
    }
  };

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      const name = e.dataTransfer.getData('invokeai/imageName');
      const type = e.dataTransfer.getData('invokeai/imageType') as ImageType;

      dispatch(initialImageSelected({ name, type }));
    },
    [dispatch]
  );

  return (
    <Flex
      sx={{
        width: 'full',
        height: 'full',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onDrop={handleDrop}
    >
      {initialImage?.url && (
        <>
          <Image
            src={getUrl(initialImage?.url)}
            fallbackStrategy="beforeLoadOrError"
            fallback={<ImageFallbackSpinner />}
            onError={onError}
            sx={{
              objectFit: 'contain',
              maxWidth: '100%',
              maxHeight: '100%',
              height: 'auto',
              position: 'absolute',
              borderRadius: 'base',
            }}
          />
          <ImageMetadataOverlay image={initialImage} />
        </>
      )}
      {!initialImage?.url && (
        <Icon
          as={FaImage}
          sx={{
            boxSize: 24,
            color: 'base.500',
          }}
        />
      )}
    </Flex>
  );
};

export default InitialImagePreview;
