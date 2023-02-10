import { DeleteIcon, EditIcon } from '@chakra-ui/icons';
import { Box, Button, Flex, Spacer, Text, Tooltip } from '@chakra-ui/react';
import { ModelStatus } from 'app/invokeai';
import {
  convertToDiffusers,
  deleteModel,
  requestModelChange,
} from 'app/socketio/actions';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/storeHooks';
import IAIAlertDialog from 'common/components/IAIAlertDialog';
import IAIIconButton from 'common/components/IAIIconButton';
import {
  setIsProcessing,
  setOpenModel,
} from 'features/system/store/systemSlice';
import { useTranslation } from 'react-i18next';
import { MdSwitchLeft } from 'react-icons/md';

type ModelListItemProps = {
  name: string;
  status: ModelStatus;
  description: string;
  format: string | undefined;
};

export default function ModelListItem(props: ModelListItemProps) {
  const { isProcessing, isConnected } = useAppSelector(
    (state: RootState) => state.system
  );

  const openModel = useAppSelector(
    (state: RootState) => state.system.openModel
  );

  const { t } = useTranslation();

  const dispatch = useAppDispatch();

  const { name, status, description, format } = props;

  const handleChangeModel = () => {
    dispatch(requestModelChange(name));
  };

  const openModelHandler = () => {
    dispatch(setOpenModel(name));
  };

  const convertModelHandler = () => {
    dispatch(setIsProcessing(true));
    dispatch(convertToDiffusers(name));
  };

  const handleModelDelete = () => {
    dispatch(deleteModel(name));
    dispatch(setOpenModel(null));
  };

  const statusTextColor = () => {
    switch (status) {
      case 'active':
        return 'var(--status-good-color)';
      case 'cached':
        return 'var(--status-working-color)';
      case 'not loaded':
        return 'var(--text-color-secondary)';
    }
  };

  return (
    <Flex
      alignItems={'center'}
      padding="0.5rem 0.5rem"
      borderRadius="0.2rem"
      backgroundColor={name === openModel ? 'var(--accent-color)' : ''}
      _hover={{
        backgroundColor:
          name === openModel
            ? 'var(--accent-color)'
            : 'var(--background-color)',
      }}
    >
      <Box onClick={openModelHandler} cursor="pointer">
        <Tooltip label={description} hasArrow placement="bottom">
          <Text fontWeight={'bold'}>{name}</Text>
        </Tooltip>
      </Box>
      <Spacer onClick={openModelHandler} cursor="pointer" />
      <Flex gap={2} alignItems="center">
        <Text color={statusTextColor()}>{status}</Text>
        <Button
          size={'sm'}
          onClick={handleChangeModel}
          isDisabled={status === 'active' || isProcessing || !isConnected}
          className="modal-close-btn"
        >
          {t('modelmanager:load')}
        </Button>

        <IAIIconButton
          icon={<EditIcon />}
          size={'sm'}
          onClick={openModelHandler}
          aria-label="Modify Config"
          isDisabled={status === 'active' || isProcessing || !isConnected}
          className=" modal-close-btn"
        />
        {format !== 'diffusers' && (
          <IAIIconButton
            icon={<MdSwitchLeft />}
            size={'sm'}
            onClick={convertModelHandler}
            aria-label="Convert Model"
            isDisabled={status === 'active' || isProcessing || !isConnected}
            className=" modal-close-btn"
          />
        )}
        <IAIAlertDialog
          title={t('modelmanager:deleteModel')}
          acceptCallback={handleModelDelete}
          acceptButtonText={t('modelmanager:delete')}
          triggerComponent={
            <IAIIconButton
              icon={<DeleteIcon />}
              size={'sm'}
              aria-label={t('modelmanager:deleteConfig')}
              isDisabled={status === 'active' || isProcessing || !isConnected}
              className=" modal-close-btn"
              style={{ backgroundColor: 'var(--btn-delete-image)' }}
            />
          }
        >
          <Flex rowGap={'1rem'} flexDirection="column">
            <p style={{ fontWeight: 'bold' }}>{t('modelmanager:deleteMsg1')}</p>
            <p style={{ color: 'var(--text-color-secondary' }}>
              {t('modelmanager:deleteMsg2')}
            </p>
          </Flex>
        </IAIAlertDialog>
      </Flex>
    </Flex>
  );
}
