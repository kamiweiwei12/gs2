# ARCH

## Core Concepts

- `node.data.params`：節點業務資料唯一入口。
- `node.data`：節點 UI / editor 狀態，例如 `label`、`highlighted`、`loopParent`。
- React Flow graph 編輯邏輯集中在 `FlowEditor.tsx`，但規則本身不應散落在多處。
- 連線合法性以 `frontend/src/utils/validateConnection.ts` 為主要真相來源。
- 拖曳中的 preview / hover feedback 屬暫時 UI state，應優先放在 `FlowEditor` local state，不污染 store。

## 目前主要檔案

- `frontend/src/components/FlowEditor/FlowEditor.tsx`
  - 編輯器 orchestration、React Flow 事件、connection preview、執行控制。
- `frontend/src/utils/validateConnection.ts`
  - 連線合法性驗證、loop scope / cycle / handle contract 規則。
- `frontend/src/utils/dslParser.ts`
  - `FlowNodeData` / helper、DSL ↔ Flow 轉換、handle 常數。
- `frontend/src/store/flowStore.ts`
  - editor/store 同步、selected node、execution highlight。
- `frontend/src/nodes/*.tsx`
  - Start / Action / Condition / Loop 自訂 renderer。
- `frontend/src/styles/flow.css`
  - Flow editor 與 preview / highlight 樣式。
- `docs/current_status.md`
  - 最新 checkpoint、工作方式、已驗證結果、下一步建議。

## 已固化的重要約束

### 1. 資料分層
- business data 不可混入 `node.data` 本體。
- UI state 不可塞進 `node.data.params`。

### 2. Handle Contract
- continuation source handle：`CONTINUATION_HANDLE`（目前值為 `out`）
- condition branch handle：`CONDITION_TRUE_HANDLE` / `CONDITION_FALSE_HANDLE`
- target handle 命名來源：`TARGET_HANDLE`
- handle 名稱優先從 `dslParser.ts` 導入，不要寫 raw string。

### 3. Flow 規則
- 不可破壞 cycle detection。
- 不可破壞 loop scope validation。
- 不可讓 preview 規則與實際 `onConnect` 規則分叉。
- execution highlight 與 connection preview 必須互不污染。

### 4. Type Safety
- `frontend/src/**/*.ts*` 目前目標維持無 `as any`。
- 若只是讀寫節點 UI state / params，優先透過 typed helper。

## 協作節奏

1. 新對話先讀 `.clinerules`、`ARCH.md`、`docs/current_status.md`
2. 先總結現況與影響範圍
3. 先給最小 implementation plan
4. 確認後再修改
5. 完成後更新 `docs/current_status.md`
6. 視任務內容執行 `npm run typecheck` / `npm run build`

## 目前推薦的工作單位

- 以「單一原子任務」為單位前進。
- 每輪只解一個明確問題。
- 每輪都要留下可追蹤 checkpoint，方便下一個對話接手。