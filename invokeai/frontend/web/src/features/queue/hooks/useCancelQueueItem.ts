import { useAppSelector } from 'app/store/storeHooks';
import { toast } from 'features/toast/toast';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCancelQueueItemMutation } from 'services/api/endpoints/queue';

export const useCancelQueueItem = (item_id: number) => {
  const isConnected = useAppSelector((s) => s.system.isConnected);
  const [trigger, { isLoading }] = useCancelQueueItemMutation();
  const { t } = useTranslation();
  const cancelQueueItem = useCallback(async () => {
    try {
      await trigger(item_id).unwrap();
      toast({
        id: 'QUEUE_CANCEL_SUCCEEDED',
        title: t('queue.cancelSucceeded'),
        status: 'success',
      });
    } catch {
      toast({
        id: 'QUEUE_CANCEL_FAILED',
        title: t('queue.cancelFailed'),
        status: 'error',
      });
    }
  }, [item_id, t, trigger]);

  return { cancelQueueItem, isLoading, isDisabled: !isConnected };
};
