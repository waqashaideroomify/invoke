import { InvIconButton } from 'common/components/InvIconButton/InvIconButton';
import { useQueueFront } from 'features/queue/hooks/useQueueFront';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { AiFillThunderbolt } from 'react-icons/ai'

import { QueueButtonTooltip } from './QueueButtonTooltip';

const QueueFrontButton = () => {
  const { t } = useTranslation();
  const { queueFront, isLoading, isDisabled } = useQueueFront();
  return (
    <InvIconButton
      aria-label={t('queue.queueFront')}
      isDisabled={isDisabled}
      isLoading={isLoading}
      onClick={queueFront}
      tooltip={<QueueButtonTooltip prepend />}
      icon={<AiFillThunderbolt />}
      size="lg"
    />
  );
};

export default memo(QueueFrontButton);
