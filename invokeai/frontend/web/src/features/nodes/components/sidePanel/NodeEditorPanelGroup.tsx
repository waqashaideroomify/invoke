import 'reactflow/dist/style.css';

import { Flex } from '@chakra-ui/react';
import QueueControls from 'features/queue/components/QueueControls';
import ResizeHandle from 'features/ui/components/tabs/ResizeHandle';
import { usePanelStorage } from 'features/ui/hooks/usePanelStorage';
import type { CSSProperties } from 'react';
import { memo, useCallback, useRef, useState } from 'react';
import type { ImperativePanelGroupHandle } from 'react-resizable-panels';
import { Panel, PanelGroup } from 'react-resizable-panels';

import InspectorPanel from './inspector/InspectorPanel';
import WorkflowPanel from './workflow/WorkflowPanel';

const panelGroupStyles: CSSProperties = { height: '100%', width: '100%' };

const NodeEditorPanelGroup = () => {
  const [isTopPanelCollapsed, setIsTopPanelCollapsed] = useState(false);
  const [isBottomPanelCollapsed, setIsBottomPanelCollapsed] = useState(false);
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const panelStorage = usePanelStorage();
  const handleDoubleClickHandle = useCallback(() => {
    if (!panelGroupRef.current) {
      return;
    }
    panelGroupRef.current.setLayout([50, 50]);
  }, []);

  return (
    <Flex w="full" h="full" gap={2} flexDir="column">
      <QueueControls />
      <PanelGroup
        ref={panelGroupRef}
        id="workflow-panel-group"
        autoSaveId="workflow-panel-group"
        direction="vertical"
        style={panelGroupStyles}
        storage={panelStorage}
      >
        <Panel
          id="workflow"
          collapsible
          onCollapse={setIsTopPanelCollapsed}
          minSize={25}
        >
          <WorkflowPanel />
        </Panel>
        <ResizeHandle
          direction="vertical"
          onDoubleClick={handleDoubleClickHandle}
          collapsedDirection={
            isTopPanelCollapsed
              ? 'top'
              : isBottomPanelCollapsed
                ? 'bottom'
                : undefined
          }
        />
        <Panel
          id="inspector"
          collapsible
          onCollapse={setIsBottomPanelCollapsed}
          minSize={25}
        >
          <InspectorPanel />
        </Panel>
      </PanelGroup>
    </Flex>
  );
};

export default memo(NodeEditorPanelGroup);
