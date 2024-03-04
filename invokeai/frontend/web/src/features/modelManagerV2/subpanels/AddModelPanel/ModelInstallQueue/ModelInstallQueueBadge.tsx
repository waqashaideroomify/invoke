import { Badge, Tooltip } from '@invoke-ai/ui-library';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModelInstallStatus } from 'services/api/types';

const STATUSES = {
  waiting: { colorScheme: 'cyan', translationKey: 'queue.pending' },
  downloading: { colorScheme: 'yellow', translationKey: 'queue.in_progress' },
  downloads_done: { colorScheme: 'yellow', translationKey: 'queue.in_progress' },
  running: { colorScheme: 'yellow', translationKey: 'queue.in_progress' },
  completed: { colorScheme: 'green', translationKey: 'queue.completed' },
  error: { colorScheme: 'red', translationKey: 'queue.failed' },
  cancelled: { colorScheme: 'orange', translationKey: 'queue.canceled' },
  downloads_done: { colorScheme: 'yellow', translationKey: 'queue.in_progress' },
};

const ModelInstallQueueBadge = ({
  status,
  errorReason,
}: {
  status?: ModelInstallStatus;
  errorReason?: string | null;
}) => {
  const { t } = useTranslation();

  if (!status || !Object.keys(STATUSES).includes(status)) {
    return null;
  }

  return (
    <Tooltip label={errorReason}>
      <Badge colorScheme={STATUSES[status].colorScheme}>{t(STATUSES[status].translationKey)}</Badge>
    </Tooltip>
  );
};
export default memo(ModelInstallQueueBadge);
