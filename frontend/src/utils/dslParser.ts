import { Edge, Node } from 'reactflow'

export type FlowNodeType = 'start' | 'action' | 'condition' | 'loop'

export type FlowNodeParams = Record<string, unknown>

export type FlowNodeData = {
  label?: string
  highlighted?: boolean
  loopParent?: string
  params?: FlowNodeParams
}

export type ActionDSL = {
  id: string
  type: 'action'
  action?: string
  target?: string
  params?: Record<string, unknown>
}

export type ConditionDSL = {
  id: string
  type: 'condition'
  condition?: string
  trueBranch: DSLExecutable[]
  falseBranch: DSLExecutable[]
  params?: Record<string, unknown>
}

export type LoopDSL = {
  id: string
  type: 'loop'
  condition?: string
  iterations?: number
  children: DSLExecutable[]
  params?: Record<string, unknown>
}

export type StartDSL = {
  id: string
  type: 'start'
  children: DSLExecutable[]
}

export type DSLExecutable = ActionDSL | ConditionDSL | LoopDSL
export type DSLDocument = StartDSL[]

type FlowGraph = {
  nodes: Node<FlowNodeData>[]
  edges: Edge[]
}

const HORIZONTAL_GAP = 220
const VERTICAL_GAP = 110
const DEFAULT_NODE_LABELS: Record<FlowNodeType, string> = {
  start: 'Start',
  action: 'Action',
  condition: 'Condition',
  loop: 'Loop',
}

export const CONTINUATION_HANDLE = 'out'
export const CONDITION_TRUE_HANDLE = 'true'
export const CONDITION_FALSE_HANDLE = 'false'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback)

const asNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const sortNodesByPosition = (a: Node<FlowNodeData>, b: Node<FlowNodeData>) => {
  if (a.position.y !== b.position.y) return a.position.y - b.position.y
  return a.position.x - b.position.x
}

const normalizeParams = (params: unknown): FlowNodeParams => (isRecord(params) ? { ...params } : {})

export const getFlowNodeParams = (data?: FlowNodeData | null): FlowNodeParams => normalizeParams(data?.params)

export const getFlowNodeHighlighted = (data?: FlowNodeData | null): boolean => data?.highlighted ?? false

export const setFlowNodeHighlighted = (data?: FlowNodeData | null, highlighted = false): FlowNodeData => ({
  label: typeof data?.label === 'string' ? data.label : undefined,
  highlighted,
  loopParent: typeof data?.loopParent === 'string' ? data.loopParent : undefined,
  params: normalizeParams(data?.params),
})

export const getFlowNodeLoopParent = (data?: FlowNodeData | null): string | undefined =>
  typeof data?.loopParent === 'string' ? data.loopParent : undefined

export const setFlowNodeLoopParent = (data?: FlowNodeData | null, loopParent?: string): FlowNodeData => ({
  label: typeof data?.label === 'string' ? data.label : undefined,
  highlighted: data?.highlighted ?? false,
  loopParent: typeof loopParent === 'string' ? loopParent : undefined,
  params: normalizeParams(data?.params),
})

export const createFlowNodeData = (
  type: FlowNodeType,
  input: Partial<FlowNodeData> = {}
): FlowNodeData => ({
  label: typeof input.label === 'string' && input.label.trim() ? input.label : DEFAULT_NODE_LABELS[type],
  highlighted: input.highlighted ?? false,
  loopParent: typeof input.loopParent === 'string' ? input.loopParent : undefined,
  params: normalizeParams(input.params),
})

const createEdge = (source: string, target: string, partial: Partial<Edge> = {}): Edge => ({
  id: `e-${source}-${target}-${partial.sourceHandle ?? 'default'}`,
  source,
  target,
  animated: true,
  ...partial,
})

const createContinuationEdge = (source: string, target: string, partial: Partial<Edge> = {}): Edge =>
  createEdge(source, target, { sourceHandle: CONTINUATION_HANDLE, ...partial })

const isContinuationEdge = (edge: Edge): boolean =>
  !edge.sourceHandle || edge.sourceHandle === CONTINUATION_HANDLE

const normalizeAction = (input: unknown): ActionDSL | null => {
  if (!isRecord(input)) return null

  const params = normalizeParams(input.params)
  const action = asString(params.action ?? input.action, 'tap')
  const target = asString(params.target ?? input.target, 'button')

  return {
    id: asString(input.id, 'action_ai'),
    type: 'action',
    action,
    target,
  }
}

const normalizeCondition = (input: unknown): ConditionDSL | null => {
  if (!isRecord(input)) return null

  const params = normalizeParams(input.params)
  const condition = asString(params.condition ?? input.condition, '')

  return {
    id: asString(input.id, 'condition_ai'),
    type: 'condition',
    condition,
    trueBranch: normalizeSequence(input.trueBranch),
    falseBranch: normalizeSequence(input.falseBranch),
  }
}

const normalizeLoop = (input: unknown): LoopDSL | null => {
  if (!isRecord(input)) return null

  const params = normalizeParams(input.params)
  const condition = asString(params.condition ?? input.condition, '')
  const iterations = asNumber(params.iterations ?? input.iterations, 3)

  return {
    id: asString(input.id, 'loop_ai'),
    type: 'loop',
    condition,
    iterations,
    children: normalizeSequence(input.children),
  }
}

const dslExecutableToParams = (item: DSLExecutable): FlowNodeParams => {
  switch (item.type) {
    case 'action':
      return {
        action: asString(item.action, 'tap'),
        target: asString(item.target, 'button'),
      }
    case 'condition':
      return {
        condition: asString(item.condition, ''),
      }
    case 'loop':
      return {
        condition: asString(item.condition, ''),
        iterations: asNumber(item.iterations, 3),
      }
  }
}

const normalizeExecutable = (input: unknown): DSLExecutable | null => {
  if (!isRecord(input)) return null

  switch (input.type) {
    case 'action':
      return normalizeAction(input)
    case 'condition':
      return normalizeCondition(input)
    case 'loop':
      return normalizeLoop(input)
    default:
      return null
  }
}

const normalizeSequence = (input: unknown): DSLExecutable[] => {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => normalizeExecutable(item))
    .filter((item): item is DSLExecutable => item !== null)
}

const normalizeStarts = (input: unknown): StartDSL[] => {
  const rawStarts = Array.isArray(input) ? input : [input]

  return rawStarts
    .map((item) => {
      if (!isRecord(item) || item.type !== 'start') return null

      return {
        id: asString(item.id, 'start_ai'),
        type: 'start' as const,
        children: normalizeSequence(item.children),
      }
    })
    .filter((item): item is StartDSL => item !== null)
}

export function dslToFlow(input: unknown): FlowGraph {
  const starts = normalizeStarts(input)
  const nodes: Node<FlowNodeData>[] = []
  const edges: Edge[] = []
  let rowCursor = 0

  const nextPosition = (depth: number) => ({
    x: 60 + depth * HORIZONTAL_GAP,
    y: 40 + rowCursor++ * VERTICAL_GAP,
  })

  const placeSequence = (sequence: DSLExecutable[], depth: number): { firstId?: string; lastId?: string } => {
    let firstId: string | undefined
    let lastId: string | undefined

    sequence.forEach((item) => {
      nodes.push({
        id: item.id,
        type: item.type,
        position: nextPosition(depth),
        data: createFlowNodeData(item.type, { params: dslExecutableToParams(item) }),
      })

      if (!firstId) firstId = item.id
      if (lastId) edges.push(createContinuationEdge(lastId, item.id))

      if (item.type === 'loop') {
        const childPlacement = placeSequence(item.children, depth + 1)
        if (childPlacement.firstId) {
          edges.push(
            createContinuationEdge(item.id, childPlacement.firstId, {
              style: { stroke: '#f59e0b' },
            })
          )
        }
      }

      if (item.type === 'condition') {
        const truePlacement = placeSequence(item.trueBranch, depth + 1)
        if (truePlacement.firstId) {
          edges.push(
            createEdge(item.id, truePlacement.firstId, {
              sourceHandle: CONDITION_TRUE_HANDLE,
              style: { stroke: '#22c55e' },
            })
          )
        }

        const falsePlacement = placeSequence(item.falseBranch, depth + 1)
        if (falsePlacement.firstId) {
          edges.push(
            createEdge(item.id, falsePlacement.firstId, {
              sourceHandle: CONDITION_FALSE_HANDLE,
              style: { stroke: '#ef4444' },
            })
          )
        }
      }

      lastId = item.id
    })

    return { firstId, lastId }
  }

  starts.forEach((start) => {
    nodes.push({
      id: start.id,
      type: 'start',
      position: nextPosition(0),
      data: createFlowNodeData('start'),
    })

    const placement = placeSequence(start.children, 1)
    if (placement.firstId) {
      edges.push(createContinuationEdge(start.id, placement.firstId))
    }
  })

  return { nodes, edges }
}

export function flowToDSL(nodes: Node[], edges: Edge[]): DSLDocument {
  const typedNodes = nodes as Node<FlowNodeData>[]
  const nodeMap = new Map<string, Node<FlowNodeData>>(typedNodes.map((node) => [node.id, node]))
  const outgoingMap = new Map<string, Edge[]>()
  const consumed = new Set<string>()

  edges.forEach((edge) => {
    const current = outgoingMap.get(edge.source) ?? []
    current.push(edge)
    outgoingMap.set(edge.source, current)
  })

  const sortEdges = (list: Edge[]) =>
    [...list].sort((a, b) => {
      const targetA = nodeMap.get(a.target)
      const targetB = nodeMap.get(b.target)
      if (!targetA || !targetB) return 0
      return sortNodesByPosition(targetA, targetB)
    })

  const getParams = (node: Node<FlowNodeData>) => getFlowNodeParams(node.data)

  const isDeeperEdge = (sourceNode: Node<FlowNodeData>, edge: Edge) => {
    const targetNode = nodeMap.get(edge.target)
    return targetNode ? targetNode.position.x > sourceNode.position.x : false
  }

  const buildSequence = (entryId?: string): DSLExecutable[] => {
    const sequence: DSLExecutable[] = []
    let currentId = entryId

    while (currentId) {
      if (consumed.has(currentId)) break

      const node = nodeMap.get(currentId)
      if (!node || node.type === 'start') break

      consumed.add(currentId)

      const outgoing = sortEdges(outgoingMap.get(node.id) ?? [])
      const plainOutgoing = outgoing.filter(isContinuationEdge)
      const params = getParams(node)

      if (node.type === 'action') {
        const action = asString(params.action, 'tap')
        const target = asString(params.target, 'button')
        sequence.push({
          id: node.id,
          type: 'action',
          action,
          target,
        })
        currentId = plainOutgoing[0]?.target
        continue
      }

      if (node.type === 'loop') {
        const childEdge = plainOutgoing.find((edge) => isDeeperEdge(node, edge))
        const continuationEdge = plainOutgoing.find((edge) => edge.id !== childEdge?.id)
        const condition = asString(params.condition, '')
        const iterations = asNumber(params.iterations, 3)

        sequence.push({
          id: node.id,
          type: 'loop',
          condition,
          iterations,
          children: buildSequence(childEdge?.target),
        })
        currentId = continuationEdge?.target
        continue
      }

      if (node.type === 'condition') {
        const condition = asString(params.condition, '')
        const trueEdge = outgoing.find((edge) => edge.sourceHandle === CONDITION_TRUE_HANDLE)
        const falseEdge = outgoing.find((edge) => edge.sourceHandle === CONDITION_FALSE_HANDLE)
        const continuationEdge = plainOutgoing.find((edge) => !isDeeperEdge(node, edge))

        sequence.push({
          id: node.id,
          type: 'condition',
          condition,
          trueBranch: buildSequence(trueEdge?.target),
          falseBranch: buildSequence(falseEdge?.target),
        })
        currentId = continuationEdge?.target
        continue
      }

      currentId = undefined
    }

    return sequence
  }

  return typedNodes
    .filter((node) => node.type === 'start')
    .sort(sortNodesByPosition)
    .map((start) => {
      const firstChild = sortEdges(outgoingMap.get(start.id) ?? []).find(isContinuationEdge)?.target

      return {
        id: start.id,
        type: 'start' as const,
        children: buildSequence(firstChild),
      }
    })
}

export function parseDSL(input: unknown): FlowGraph {
  return dslToFlow(input)
}

export function toDSL(nodes: Node[], edges: Edge[]): string {
  return JSON.stringify(flowToDSL(nodes, edges), null, 2)
}
