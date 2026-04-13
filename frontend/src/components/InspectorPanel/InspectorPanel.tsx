import React from 'react'
import { useFlowStore } from '../../store/flowStore'
import ActionEditor from './ActionEditor'
import ConditionEditor from './ConditionEditor'
import LoopEditor from './LoopEditor'

const InspectorPanel: React.FC = () => {
  const selected = useFlowStore((s) => s.selectedNode)
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode)

  if (!selected) return null

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Inspector</strong>
        <button onClick={() => setSelectedNode(null)}>Close</button>
      </div>
      <div style={{ marginTop: 8 }}>
        {selected.type === 'action' && <ActionEditor />}
        {selected.type === 'condition' && <ConditionEditor />}
        {selected.type === 'loop' && <LoopEditor />}
        {selected.type === 'start' && <div>Start node has no editable params</div>}
      </div>
    </div>
  )
}

export default InspectorPanel
