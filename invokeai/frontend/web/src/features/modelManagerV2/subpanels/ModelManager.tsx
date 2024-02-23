import { Box, Button, Flex, Heading } from '@invoke-ai/ui-library';
import { useAppDispatch } from 'app/store/storeHooks';
import { SyncModelsIconButton } from 'features/modelManagerV2/components/SyncModels/SyncModelsIconButton';
import { setSelectedModelKey } from 'features/modelManagerV2/store/modelManagerV2Slice';
import { useCallback } from 'react';

import ModelList from './ModelManagerPanel/ModelList';
import { ModelListNavigation } from './ModelManagerPanel/ModelListNavigation';

export const ModelManager = () => {
  const dispatch = useAppDispatch();
  const handleClickAddModel = useCallback(() => {
    dispatch(setSelectedModelKey(null));
  }, [dispatch]);

  return (
    <Box layerStyle="first" p={3} borderRadius="base" w="50%" h="full">
      <Flex w="full" p={3} justifyContent="space-between" alignItems="center">
        <Flex gap={2}>
          <Heading fontSize="xl">Model Manager</Heading>
          <SyncModelsIconButton />
        </Flex>
        <Button colorScheme="invokeYellow" onClick={handleClickAddModel}>
          Add Models
        </Button>
      </Flex>
      <Box layerStyle="second" p={3} borderRadius="base" w="full" h="full">
        <ModelListNavigation />
        <ModelList />
      </Box>
    </Box>
  );
};
