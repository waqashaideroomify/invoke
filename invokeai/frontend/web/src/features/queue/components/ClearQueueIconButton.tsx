import { useDisclosure } from '@chakra-ui/react';
import { useStore } from '@nanostores/react';
import { InvIconButton } from 'common/components/InvIconButton/InvIconButton';
import type { InvIconButtonProps } from 'common/components/InvIconButton/types';
import { $shift } from 'common/hooks/useGlobalModifiers';
import ClearQueueConfirmationAlertDialog from 'features/queue/components/ClearQueueConfirmationAlertDialog';
import { useCancelCurrentQueueItem } from 'features/queue/hooks/useCancelCurrentQueueItem';
import { useClearQueue } from 'features/queue/hooks/useClearQueue';
import { useTranslation } from 'react-i18next';
import { PiTrashSimpleBold, PiXBold } from 'react-icons/pi';

type Props = Omit<InvIconButtonProps, 'aria-label'>;

const ClearQueueIconButton = ({
  onOpen,
  ...props
}: Props & { onOpen: () => void }) => {
  const { t } = useTranslation();
  const { isLoading, isDisabled } = useClearQueue();

  return (
    <>
      <InvIconButton
        isDisabled={isDisabled}
        isLoading={isLoading}
        aria-label={t('queue.clear')}
        tooltip={t('queue.clearTooltip')}
        icon={<PiTrashSimpleBold size="16px" />}
        colorScheme="error"
        onClick={onOpen}
        data-testid={t('queue.clear')}
        {...props}
      />
    </>
  );
};

const ClearSingleQueueItemIconButton = (props: Props) => {
  const { t } = useTranslation();
  const { cancelQueueItem, isLoading, isDisabled } =
    useCancelCurrentQueueItem();

  return (
    <>
      <InvIconButton
        isDisabled={isDisabled}
        isLoading={isLoading}
        aria-label={t('queue.cancel')}
        tooltip={t('queue.cancelTooltip')}
        icon={<PiXBold size="16px" />}
        colorScheme="error"
        onClick={cancelQueueItem}
        data-testid={t('queue.cancel')}
        {...props}
      />
    </>
  );
};

export const ClearQueueButton = (props: Props) => {
  // Show the single item clear button when shift is pressed
  // Otherwise show the clear queue button
  const shift = useStore($shift);

  const disclosure = useDisclosure();

  return (
    <>
      {shift ? (
        <ClearQueueIconButton {...props} onOpen={disclosure.onOpen} />
      ) : (
        <ClearSingleQueueItemIconButton {...props} />
      )}
      <ClearQueueConfirmationAlertDialog disclosure={disclosure} />
    </>
  );
};

export default ClearQueueButton;
