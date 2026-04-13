import { create } from 'zustand'
import { Node, Edge } from 'reactflow'
import { getFlowNodeParams, setFlowNodeHighlighted } from '../utils/dslParser'

export type StageEvent = {
  kind: 'start' | 'action' | 'condition' | 'loop' | 'finish'
  label: string
  detail?: string
}

const syncSelectedNode = (nodes: Node[], selectedNode: Node | null) => {
  if (!selectedNode) return null
  return nodes.find((node) => node.id === selectedNode.id) ?? null
}

const setHighlightedNode = (nodes: Node[], targetId: string | null) =>
  nodes.map((node) => ({
    ...node,
    data: setFlowNodeHighlighted(node.data, targetId ? node.id === targetId : false),
  }))

const mergeNodeData = (node: Node, data: Record<string, unknown>) => ({
  ...node,
  data: {
    ...(node.data as Record<string, unknown>),
    ...data,
  },
})

const mergeNodeParams = (node: Node, params: Record<string, unknown>) => ({
  ...node,
  data: {
    ...(node.data as Record<string, unknown>),
    params: {
      ...getFlowNodeParams(node.data),
      ...params,
    },
  },
})

interface FlowState {
  nodes: Node[]
  edges: Edge[]
  selectedNode: Node | null
  executionNodeId: string | null
  isRunning: boolean
  stageEvent: StageEvent | null
  runLog: string[]
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  setSelectedNode: (node: Node | null) => void
  updateNodeData: (id: string, data: Record<string, unknown>) => void
  updateNodeParams: (id: string, params: Record<string, unknown>) => void
  setExecutionNodeId: (id: string | null) => void
  setIsRunning: (isRunning: boolean) => void
  setStageEvent: (event: StageEvent | null) => void
  setRunLog: (logs: string[]) => void
  appendRunLog: (entry: string) => void
  highlightSingleNode: (id: string | null) => void
  clearNodeHighlights: () => void
  resetExecutionState: () => void
}

export const useFlowStore = create<FlowState>((set) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  executionNodeId: null,
  isRunning: false,
  stageEvent: null,
  runLog: [],
  setNodes: (nodes) =>
    set((state) => ({
      nodes,
      selectedNode: syncSelectedNode(nodes, state.selectedNode),
    })),
  setEdges: (edges) => set({ edges }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  updateNodeData: (id, data) =>
    set((state) => {
      const nodes = state.nodes.map((n) => (n.id === id ? mergeNodeData(n, data) : n))

      return {
        nodes,
        selectedNode: syncSelectedNode(nodes, state.selectedNode),
      }
    }),
  updateNodeParams: (id, params) =>
    set((state) => {
      const nodes = state.nodes.map((n) => (n.id === id ? mergeNodeParams(n, params) : n))

      return {
        nodes,
        selectedNode: syncSelectedNode(nodes, state.selectedNode),
      }
    }),
  setExecutionNodeId: (executionNodeId) => set({ executionNodeId }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setStageEvent: (stageEvent) => set({ stageEvent }),
  setRunLog: (runLog) => set({ runLog }),
  appendRunLog: (entry) => set((state) => ({ runLog: [...state.runLog, entry] })),
  highlightSingleNode: (id) =>
    set((state) => {
      const nodes = setHighlightedNode(state.nodes, id)
      return {
        nodes,
        executionNodeId: id,
        selectedNode: syncSelectedNode(nodes, state.selectedNode),
      }
    }),
  clearNodeHighlights: () =>
    set((state) => {
      const nodes = setHighlightedNode(state.nodes, null)
      return {
        nodes,
        executionNodeId: null,
        selectedNode: syncSelectedNode(nodes, state.selectedNode),
      }
    }),
  resetExecutionState: () =>
    set((state) => {
      const nodes = setHighlightedNode(state.nodes, null)
      return {
        nodes,
        executionNodeId: null,
        isRunning: false,
        stageEvent: null,
        selectedNode: syncSelectedNode(nodes, state.selectedNode),
      }
    }),
}))
