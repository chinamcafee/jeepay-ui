<template>
  <div>
    <a-alert
      type="info"
      show-icon
      class="section"
      message="对账重跑始终创建新批次；旧批次及其计数不可修改，PENDING/RUNNING 批次不可重跑"
    />
    <a-card class="section">
      <a-form layout="inline">
        <a-form-item label="环境">
          <a-select
            v-model:value="vdata.filters.environment"
            placeholder="全部"
            allow-clear
            style="width: 130px"
          >
            <a-select-option value="SANDBOX">Sandbox</a-select-option>
            <a-select-option value="PRODUCTION">Production</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="类型">
          <a-select
            v-model:value="vdata.filters.type"
            placeholder="全部"
            allow-clear
            style="width: 230px"
          >
            <a-select-option value="NOTIFICATION_HISTORY">通知历史</a-select-option>
            <a-select-option value="TRANSACTION_VERIFY">交易复核</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="vdata.filters.state"
            placeholder="全部"
            allow-clear
            style="width: 130px"
          >
            <a-select-option v-for="item in stateOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="时间">
          <a-select v-model:value="vdata.filters.queryDateRange" style="width: 120px">
            <a-select-option value="near2now|7">近 7 天</a-select-option>
            <a-select-option value="near2now|30">近 30 天</a-select-option>
            <a-select-option value="near2now|90">近 90 天</a-select-option>
            <a-select-option value="">服务端默认 30 天</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="load(1)">查询</a-button>
            <a-button @click="reset">重置</a-button>
            <a-button type="primary" ghost @click="openCreate">创建对账批次</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
    <a-alert
      v-if="vdata.auditResult"
      type="success"
      show-icon
      class="section"
      :message="`对账动作已受理：${vdata.auditResult.resultReference || '-'}`"
      :description="`审计 ID：${vdata.auditResult.auditId || '-'}；幂等命中：${vdata.auditResult.idempotent ? '是' : '否'}`"
    />
    <a-alert v-if="vdata.error" type="error" show-icon :message="vdata.error" class="section" />
    <a-table
      :columns="columns"
      :data-source="vdata.records"
      :loading="vdata.loading"
      :pagination="vdata.pagination"
      :scroll="{ x: 1750 }"
      row-key="reconcileRunId"
      size="small"
      @change="tableChanged"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'type'">
          {{
            record.reconcileType === 'NOTIFICATION_HISTORY'
              ? '通知历史'
              : record.reconcileType === 'TRANSACTION_VERIFY'
                ? '交易复核'
                : record.reconcileType
          }}
        </template>
        <template v-else-if="column.key === 'window'">
          <div>{{ formatAppleTime(record.windowStart) }}</div>
          <div class="secondary">至 {{ formatAppleTime(record.windowEnd) }}</div>
        </template>
        <template v-else-if="column.key === 'state'">
          <a-tag :color="stateColor(record.state)">{{ stateText(record.state) }}</a-tag>
        </template>
        <template v-else-if="column.key === 'progress'">
          <div>页 {{ record.pageCount || 0 }} / 接收 {{ record.receivedCount || 0 }}</div>
          <div class="secondary">
            新增 {{ record.insertedCount || 0 }} / 重复 {{ record.duplicateCount || 0 }} / 错误
            {{ record.errorCount || 0 }}
          </div>
        </template>
        <template v-else-if="column.key === 'times'">
          <div>开始：{{ formatAppleTime(record.startedAt) }}</div>
          <div class="secondary">结束：{{ formatAppleTime(record.finishedAt) }}</div>
          <div class="secondary">更新：{{ formatAppleTime(record.updatedAt) }}</div>
        </template>
        <template v-else-if="column.key === 'error'">
          <div>{{ record.lastErrorCode || '-' }}</div>
          <div class="secondary error-text">
            {{ safeAppleError(record.lastErrorMessage || '-') }}
          </div>
        </template>
        <template v-else-if="column.key === 'op'">
          <a-button
            v-if="terminalStates.includes(Number(record.state))"
            danger
            type="link"
            size="small"
            @click="rerun(record)"
          >
            创建重跑批次
          </a-button>
          <span v-else>{{ Number(record.state) === 1 ? '运行中不可重跑' : '等待调度' }}</span>
        </template>
      </template>
    </a-table>

    <a-modal
      wrap-class-name="apple-iap-ui apple-iap-dialog"
      v-model:open="vdata.createOpen"
      title="创建 Apple IAP 对账批次"
      :confirm-loading="vdata.createLoading"
      :mask-closable="false"
      ok-text="创建新批次"
      @ok="submitCreate"
      @cancel="closeCreate"
    >
      <a-alert
        type="warning"
        show-icon
        class="section"
        :message="`Sandbox 最多回看 30 天，Production 最多回看 180 天；当前上限 ${createMaxDays} 天`"
      />
      <a-alert
        v-if="vdata.createError"
        type="error"
        show-icon
        :message="vdata.createError"
        class="section"
      />
      <a-form ref="createFormRef" :model="vdata.createForm" :rules="createRules" layout="vertical">
        <a-form-item label="环境" name="environment">
          <a-select v-model:value="vdata.createForm.environment">
            <a-select-option value="SANDBOX">Sandbox</a-select-option>
            <a-select-option value="PRODUCTION">Production</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="对账类型" name="reconcileType">
          <a-select v-model:value="vdata.createForm.reconcileType">
            <a-select-option value="NOTIFICATION_HISTORY">通知历史</a-select-option>
            <a-select-option value="TRANSACTION_VERIFY">交易复核</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="对账窗口" name="window">
          <a-range-picker
            v-model:value="vdata.createForm.window"
            show-time
            style="width: 100%"
            :disabled-date="disabledFuture"
          />
        </a-form-item>
        <a-form-item label="操作原因" name="reason">
          <a-textarea
            v-model:value="vdata.createForm.reason"
            :rows="3"
            :maxlength="500"
            placeholder="至少 8 个字符，将写入防篡改审计链"
          />
        </a-form-item>
      </a-form>
      <div class="secondary">
        幂等键：{{ vdata.createForm.idempotencyKey || '-' }}（失败后保持不变）
      </div>
    </a-modal>
    <AppleIapActionModal ref="actionModalRef" @completed="actionCompleted" />
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { appleIapOps } from '../appleIapOpsAdapter'
import { formatAppleTime, newAppleIdempotencyKey, safeAppleError } from '../appleIapUiUtils'
import AppleIapActionModal from './AppleIapActionModal.vue'

const props = defineProps({
  mchNo: { type: String, default: '' },
  appId: { type: String, required: true },
})
const actionModalRef = ref()
const createFormRef = ref()
const terminalStates = [2, 3, 4, 5]
const stateOptions = options({
  0: '待执行',
  1: '运行中',
  2: '成功',
  3: '部分成功',
  4: '失败',
  5: '已取消',
})
const columns = [
  { title: 'Run ID', dataIndex: 'reconcileRunId', key: 'reconcileRunId', width: 110 },
  { title: '环境', dataIndex: 'environment', key: 'environment', width: 110 },
  { title: '类型', key: 'type', width: 150 },
  { title: '数据窗口', key: 'window', width: 230 },
  { title: '状态', key: 'state', width: 110 },
  { title: '实时进度', key: 'progress', width: 250 },
  { title: '执行时间', key: 'times', width: 230 },
  { title: '错误摘要', key: 'error', width: 220 },
  { title: '操作', key: 'op', fixed: 'right', width: 150 },
]
const defaults = () => ({
  environment: undefined,
  type: undefined,
  state: undefined,
  queryDateRange: 'near2now|30',
})
const emptyCreate = () => ({
  environment: 'SANDBOX',
  reconcileType: 'NOTIFICATION_HISTORY',
  window: [dayjs().subtract(7, 'day'), dayjs()],
  reason: '',
  idempotencyKey: '',
})
const vdata: any = reactive({
  loading: false,
  error: '',
  records: [],
  auditResult: null,
  filters: defaults(),
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
  },
  createOpen: false,
  createLoading: false,
  createError: '',
  createForm: emptyCreate(),
})
const createRules = {
  environment: [{ required: true, message: '请选择环境', trigger: 'change' }],
  reconcileType: [{ required: true, message: '请选择类型', trigger: 'change' }],
  window: [{ required: true, type: 'array', len: 2, message: '请选择完整窗口', trigger: 'change' }],
  reason: [
    { required: true, message: '请输入原因', trigger: 'blur' },
    { min: 8, max: 500, message: '原因必须为 8～500 个字符', trigger: 'blur' },
  ],
}
const createMaxDays = computed(() => (vdata.createForm.environment === 'SANDBOX' ? 30 : 180))
let pollTimer: any = null

onMounted(() => {
  load(1)
  pollTimer = globalThis.setInterval(() => {
    if (vdata.records.some((row) => [0, 1].includes(Number(row.state))))
      load(vdata.pagination.current, true)
  }, 5000)
})
onBeforeUnmount(() => {
  if (pollTimer) globalThis.clearInterval(pollTimer)
})
async function load(current = 1, silent = false) {
  if (silent && vdata.loading) return
  if (!silent) vdata.loading = true
  vdata.error = ''
  try {
    const f = vdata.filters
    const result = await appleIapOps.reconcileRuns(scope(), {
      pageNumber: current,
      pageSize: vdata.pagination.pageSize,
      environment: f.environment,
      type: f.type,
      state: f.state,
      queryDateRange: f.queryDateRange || undefined,
    })
    vdata.records = result.records || []
    vdata.pagination.current = Number(result.current || current)
    vdata.pagination.total = Number(result.total || 0)
  } catch (error: any) {
    if (!silent) {
      vdata.records = []
      vdata.pagination.total = 0
      vdata.error = '对账批次加载失败：' + safeAppleError(error)
    }
  } finally {
    if (!silent) vdata.loading = false
  }
}
function openCreate() {
  vdata.createForm = emptyCreate()
  vdata.createForm.idempotencyKey = newAppleIdempotencyKey()
  vdata.createError = ''
  vdata.createOpen = true
}
async function submitCreate() {
  try {
    await createFormRef.value.validate()
  } catch (_) {
    return
  }
  const [start, end] = vdata.createForm.window || []
  const duration = end && start ? end.valueOf() - start.valueOf() : 0
  if (
    duration <= 0 ||
    duration > createMaxDays.value * 24 * 60 * 60 * 1000 ||
    end.valueOf() > Date.now() + 60_000
  ) {
    vdata.createError = `对账窗口必须按时间正序、不得晚于当前时间且不超过 ${createMaxDays.value} 天`
    return
  }
  vdata.createLoading = true
  vdata.createError = ''
  let completed: any = null
  try {
    completed = await appleIapOps.createReconcile(scope(), {
      environment: vdata.createForm.environment,
      reconcileType: vdata.createForm.reconcileType,
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
      reason: vdata.createForm.reason.trim(),
      idempotencyKey: vdata.createForm.idempotencyKey,
    })
    vdata.auditResult = completed
    await load(1)
  } catch (error: any) {
    vdata.createError = '创建对账失败：' + safeAppleError(error)
  } finally {
    vdata.createLoading = false
    if (completed) closeCreate()
  }
}
function closeCreate() {
  if (vdata.createLoading) return
  vdata.createOpen = false
  vdata.createError = ''
  vdata.createForm = emptyCreate()
}
function rerun(record) {
  actionModalRef.value.show({
    title: '创建新的对账重跑批次',
    description: `源批次 ${record.reconcileRunId} 保持不可变；系统将复制其窗口创建新批次。`,
    expectedState: stateCode(record.state),
    action: (data) => appleIapOps.rerunReconcile(scope(), record.reconcileRunId, data),
  })
}
async function actionCompleted(result) {
  vdata.auditResult = result || {}
  await load(1)
}
function reset() {
  vdata.filters = defaults()
  load(1)
}
function tableChanged(pagination) {
  vdata.pagination.pageSize = pagination.pageSize
  load(pagination.current)
}
function disabledFuture(current) {
  return current && current.valueOf() > dayjs().endOf('day').valueOf()
}
function scope() {
  return { mchNo: props.mchNo, appId: props.appId }
}
function options(values) {
  return Object.entries(values).map(([value, label]) => ({ value, label }))
}
function stateCode(state) {
  return { 2: 'SUCCESS', 3: 'PARTIAL', 4: 'FAILED', 5: 'CANCELLED' }[Number(state)] || 'UNKNOWN'
}
function stateText(state) {
  return (
    { 0: '待执行', 1: '运行中', 2: '成功', 3: '部分成功', 4: '失败', 5: '已取消' }[Number(state)] ||
    `未知(${state ?? '-'})`
  )
}
function stateColor(state) {
  return (
    { 0: 'default', 1: 'blue', 2: 'green', 3: 'orange', 4: 'red', 5: 'default' }[Number(state)] ||
    'default'
  )
}
</script>

<style lang="less" scoped>
.section {
  margin-bottom: 16px;
}
.secondary {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.error-text {
  max-width: 210px;
  white-space: normal;
}
</style>
