import { useState, ChangeEvent, ReactNode } from 'react';
import { Flex, Input, Text } from '@chakra-ui/react';
import { createSelector } from '@reduxjs/toolkit';
import { RootState, useAppSelector } from 'app/store';
import { SystemState } from 'features/system/store/systemSlice';
import AddModel from './AddModel';
import ModelListItem from './ModelListItem';
import _ from 'lodash';
import IAIInput from 'common/components/IAIInput';

const modelListSelector = createSelector(
  (state: RootState) => state.system,
  (system: SystemState) => {
    const models = _.map(system.model_list, (model, key) => {
      return { name: key, ...model };
    });

    const activeModel = models.find((model) => model.status === 'active');

    return {
      models,
      activeModel: activeModel,
    };
  }
);

const ModelList = () => {
  const { models } = useAppSelector(modelListSelector);

  const [searchText, setSearchText] = useState<string>('');

  const handleSearchFilter = _.debounce((e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, 400);

  const renderModelListItems = () => {
    const modelListItemsToRender: ReactNode[] = [];
    const filteredModelListItemsToRender: ReactNode[] = [];

    models.forEach((model, i) => {
      if (model.name.startsWith(searchText)) {
        filteredModelListItemsToRender.push(
          <ModelListItem
            key={i}
            name={model.name}
            status={model.status}
            description={model.description}
          />
        );
      }
      modelListItemsToRender.push(
        <ModelListItem
          key={i}
          name={model.name}
          status={model.status}
          description={model.description}
        />
      );
    });

    return searchText !== ''
      ? filteredModelListItemsToRender
      : modelListItemsToRender;
  };

  return (
    <Flex flexDirection={'column'} rowGap="2rem" width={'50%'}>
      <Flex justifyContent={'space-between'}>
        <Text fontSize={'1.4rem'} fontWeight="bold">
          Available Models
        </Text>
        <AddModel />
      </Flex>

      <IAIInput onChange={handleSearchFilter} label="Search" />

      <Flex flexDirection={'column'} gap={4}>
        {renderModelListItems()}
      </Flex>
    </Flex>
  );
};

export default ModelList;
