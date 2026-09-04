<template>
  <div>
    <a-alert
      type="info"
      show-icon
      class="section"
      message="只有 DEAD 任务可由人工受审计重排；PENDING/RETRY 由 worker 调度，RUNNING 禁止并发执行"
    />
    <a-card class="section">
      <a-form layout="inline">
        <a-form-item label="环境">
          <a-select v-model:value="vdata.filters.environment" allow-clear style="width: 130px">
            <a-select-option value="SANDBOX">Sandbox</a-select-option>
            <a-select-option value="PRODUCTION">Production</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="任务类型">
          <a-select v-model:value="vdata.filters.type" allow-clear show-search style="width: 260px">
            <a-select-option v-for="type in jobTypes" :key="type" :value="type">
              {{ type }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="vdata.filters.state" allow-clear style="width: 130px">
            <a-select-option v-for="item in stateOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="关键词">
          <a-input
            v-model:value="vdata.filters.keyword"
            :maxlength="100"
            allow-clear
            placeholder="交易/订单/错误码"
          />
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
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
    <a-alert
      v-if="vdata.auditResult"
      type="success"
      show-icon
      class="section"
      :message="`任务已重排：${vdata.auditResult.resultReference || '-'}`"
      :description="`审计 ID：${vdata.auditResult.auditId || '-'}；幂等命中：${vdata.auditResult.idempotent ? '是' : '否'}`"
    />
    <a-alert v-if="vdata.error" type="error" show-icon :message="vdata.error" class="section" />
    <a-table
      :columns="columns"
      :data-source="vdata.records"
      :loading="vdata.loading"
      :pagination="vdata.pagination"
      :scroll="{ x: 1800 }"
      row-key="jobId"
      size="small"
      @change="tableChanged"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'target'">
          <div>交易：{{ record.transactionId || '-' }}</div>
          <div class="secondary">订单：{{ record.payOrderId || '-' }}</div>
          <div class="secondary">
            通知：{{ record.appleNotificationPk || '-' }} / 对账：{{ record.reconcileRunId || '-' }}
          </div>
        </template>
        <template v-else-if="column.key === 'state'">
          <a-tag :color="stateColor(record.state)">{{ stateText(record.state) }}</a-tag>
        </template>
        <template v-else-if="column.key === 'attempts'">
          {{ record.attempts || 0 }} / {{ record.maxAttempts || 0 }}
        </template>
        <template v-else-if="column.key === 'schedule'">
          <div>下次：{{ formatAppleTime(record.nextRunAt) }}</div>
          <div class="secondary">租约至：{{ formatAppleTime(record.leaseUntil) }}</div>
          <div class="secondary">完成：{{ formatAppleTime(record.finishedAt) }}</div>
        </template>
        <template v-else-if="column.key === 'error'">
          <div>{{ record.lastErrorCode || '-' }}</div>
          <div class="secondary error-text">
            {{ safeAppleError(record.lastErrorMessage || '-') }}
          </div>
        </template>
        <template v-else-if="column.key === 'op'">
          <a-button
            v-if="canRetry && Number(record.state) === 4"
            danger
            type="link"
            size="small"
            @click="retry(record)"
          >
            受审计重排
          </a-button>
          <span v-else>{{ Number(record.state) === 1 ? '运行中不可重试' : '无可用动作' }}</span>
        </template>
      </template>
    </a-table>
    <AppleIapActionModal ref="actionModalRef" @completed="actionCompleted" />
  </div>
</template>

<script setup lang="ts">
import { getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { appleIapOps } from '../appleIapOpsAdapter'
import { formatAppleTime, safeAppleError } from '../appleIapUiUtils'
import AppleIapActionModal from './AppleIapActionModal.vue'

const props = defineProps({
  mchNo: { type: String, default: '' },
  appId: { type: String, required: true },
})
const { $access } = getCurrentInstance()!.appContext.config.globalProperties
const canRetry = $access('ENT_APPLE_IAP_JOB_RETRY')
const actionModalRef = ref()
const jobTypes = [
  'VERIFY_TRANSACTION',
  'PROCESS_NOTIFICATION',
  'FINISH_TRANSACTION',
  'SEND_CONSUMPTION',
  'RECONCILE_NOTIFICATION_HISTORY',
  'RECONCILE_TRANSACTION',
  'SEND_LIFECYCLE_NOTIFICATION',
]
const stateOptions = options({
  0: '待执行',
  1: '运行中',
  2: '成功',
  3: '待重试',
  4: '死信',
  5: '已取消',
})
const columns = [
  { title: 'Job ID', dataIndex: 'jobId', key: 'jobId', width: 110 },
  { title: '环境', dataIndex: 'environment', key: 'environment', width: 110 },
  { title: '任务类型', dataIndex: 'jobType', key: 'jobType', width: 250 },
  { title: '关联目标', key: 'target', width: 300 },
  { title: '状态', key: 'state', width: 110 },
  { title: '尝试/上限', key: 'attempts', width: 110 },
  { title: '调度时间', key: 'schedule', width: 240 },
  { title: '错误摘要', key: 'error', width: 220 },
  { title: '操作', key: 'op', fixed: 'right', width: 150 },
]
const defaults = () => ({
  environment: undefined,
  type: undefined,
  state: undefined,
  keyword: '',
  queryDateRange: 'near2now|30',
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
})

onMounted(() => load(1))
async function load(current = 1) {
  vdata.loading = true
  vdata.error = ''
  try {
    const f = vdata.filters
    const result = await appleIapOps.jobs(scope(), {
      pageNumber: current,
      pageSize: vdata.pagination.pageSize,
      environment: f.environment,
      type: f.type,
      state: f.state,
      keyword: f.keyword.trim() || undefined,
      queryDateRange: f.queryDateRange || undefined,
    })
    vdata.records = result.records || []
    vdata.pagination.current = Number(result.current || current)
    vdata.pagination.total = Number(result.total || 0)
  } catch (error: any) {
    vdata.records = []
    vdata.pagination.total = 0
    vdata.error = '任务列表加载失败：' + safeAppleError(error)
  } finally {
    vdata.loading = false
  }
}
function retry(record) {
  actionModalRef.value.show({
    title: '受审计重排死信任务',
    description: `仅重排 DEAD Job ${record.jobId}，不会直接执行或修改业务成功状态。`,
    expectedState: 'DEAD',
    action: (data) => appleIapOps.retryJob(scope(), record.jobId, data),
  })
}
async function actionCompleted(result) {
  vdata.auditResult = result || {}
  await load(vdata.pagination.current)
}
function reset() {
  vdata.filters = defaults()
  load(1)
}
function tableChanged(pagination) {
  vdata.pagination.pageSize = pagination.pageSize
  load(pagination.current)
}
function scope() {
  return { mchNo: props.mchNo, appId: props.appId }
}
function options(values) {
  return Object.entries(values).map(([value, label]) => ({ value, label }))
}
function stateText(state) {
  return (
    { 0: '待执行', 1: '运行中', 2: '成功', 3: '待重试', 4: '死信', 5: '已取消' }[Number(state)] ||
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
