import React, { useEffect, useState } from 'react'
import { useFlowStore } from '../../store/flowStore'
import { getFlowNodeParams } from '../../utils/dslParser'

const LoopEditor: React.FC = () => {
  const selected = useFlowStore((s) => s.selectedNode)
  const updateNodeParams = useFlowStore((s) => s.updateNodeParams)

  const [condition, setCondition] = useState('')
  const [iterations, setIterations] = useState(3)

  useEffect(() => {
    if (!selected) return
    const params = getFlowNodeParams(selected.data)
    setCondition(typeof params.condition === 'string' ? params.condition : '')
    const nextIterations = typeof params.iterations === 'number' ? params.iterations : Number(params.iterations)
    setIterations(Number.isFinite(nextIterations) ? nextIterations : 3)
  }, [selected])

  const onConditionChange = (val: string) => {
    setCondition(val)
    if (!selected) return
    updateNodeParams(selected.id, { condition: val })
  }

  const onIterationsChange = (val: number) => {
    setIterations(val)
    if (!selected) return
    updateNodeParams(selected.id, { iterations: val })
  }

  if (!selected) return null

  return (
    <div style={{ padding: 8, background: '#fff', borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
      <h4 style={{ margin: 0, marginBottom: 8 }}>Loop</h4>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#333' }}>循环条件</label>
        <input value={condition} onChange={(e) => onConditionChange(e.target.value)} placeholder="e.g. gold < max" style={{ marginTop: 6, padding: 6, width: '100%' }} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 12, color: '#333' }}>迭代次数</label>
        <input type="number" value={iterations} onChange={(e) => onIterationsChange(Number(e.target.value))} style={{ marginTop: 6, padding: 6, width: 120 }} />
      </div>
    </div>
  )
}

export default LoopEditor
