import { IconButton } from '@invoke-ai/ui-library';
import { useAppSelector } from 'app/store/storeHooks';
import { useSaveWorkflowAsDialog } from 'features/workflowLibrary/components/SaveWorkflowAsDialog/useSaveWorkflowAsDialog';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PiFloppyDiskBold } from 'react-icons/pi';

import { isWorkflowWithID, useSaveLibraryWorkflow } from '../../../../../workflowLibrary/hooks/useSaveWorkflow';
import { $builtWorkflow } from '../../../../hooks/useWorkflowWatcher';

const SaveWorkflowButton = () => {
  const { t } = useTranslation();
  const isTouched = useAppSelector((s) => s.workflow.isTouched);
  const { onOpen } = useSaveWorkflowAsDialog();
  const { saveWorkflow } = useSaveLibraryWorkflow();

  const handleClickSave = useCallback(async () => {
    const builtWorkflow = $builtWorkflow.get();
    if (!builtWorkflow) {
      return;
    }

    if (isWorkflowWithID(builtWorkflow)) {
      saveWorkflow();
    } else {
      onOpen();
    }
  }, [onOpen, saveWorkflow]);

  return (
    <IconButton
      tooltip={t('workflows.saveWorkflow')}
      aria-label={t('workflows.saveWorkflow')}
      icon={<PiFloppyDiskBold />}
      isDisabled={!isTouched}
      onClick={handleClickSave}
      pointerEvents="auto"
    />
  );
};

export default memo(SaveWorkflowButton);
