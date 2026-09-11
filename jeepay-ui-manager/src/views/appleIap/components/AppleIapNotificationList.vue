<template>
  <a-tabs v-model:activeKey="vdata.active" @change="tabChanged">
    <a-tab-pane key="notifications" tab="Server Notifications V2">
      <a-card class="section">
        <a-form layout="inline">
          <a-form-item label="环境">
            <a-select
              v-model:value="notice.filters.environment"
              placeholder="全部"
              allow-clear
              style="width: 130px"
            >
              <a-select-option value="SANDBOX">Sandbox</a-select-option>
              <a-select-option value="PRODUCTION">Production</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="类型">
            <a-input v-model:value="notice.filters.type" :maxlength="64" allow-clear />
          </a-form-item>
          <a-form-item label="交易 ID">
            <a-input v-model:value="notice.filters.transactionId" :maxlength="128" allow-clear />
          </a-form-item>
          <a-form-item label="处理状态">
            <a-select
              v-model:value="notice.filters.state"
              placeholder="全部"
              allow-clear
              style="width: 130px"
            >
              <a-select-option
                v-for="item in noticeStateOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="时间">
            <a-select v-model:value="notice.filters.queryDateRange" style="width: 120px">
              <a-select-option value="near2now|7">近 7 天</a-select-option>
              <a-select-option value="near2now|30">近 30 天</a-select-option>
              <a-select-option value="near2now|90">近 90 天</a-select-option>
              <a-select-option value="">服务端默认 30 天</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item>
            <a-space>
              <a-button type="primary" @click="loadNotifications(1)">查询</a-button>
              <a-button @click="resetNotifications">重置</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </a-card>
      <a-alert v-if="notice.error" type="error" show-icon :message="notice.error" class="section" />
      <a-table
        :columns="noticeColumns"
        :data-source="notice.records"
        :loading="notice.loading"
        :pagination="notice.pagination"
        :scroll="{ x: 1550 }"
        row-key="appleNotificationPk"
        size="small"
        @change="noticeTableChanged"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'uuid'">
            <a-typography-paragraph
              :copyable="{ text: record.notificationUuid }"
              class="identifier"
            >
              {{ record.notificationUuid || '-' }}
            </a-typography-paragraph>
          </template>
          <template v-else-if="column.key === 'type'">
            <div>{{ record.notificationType || '-' }}</div>
            <div class="secondary">{{ record.notificationSubtype || '-' }}</div>
          </template>
          <template v-else-if="column.key === 'transactionId'">
            <a-typography-paragraph :copyable="{ text: record.transactionId }" class="identifier">
              {{ record.transactionId || '-' }}
            </a-typography-paragraph>
          </template>
          <template v-else-if="column.key === 'state'">
            <a-tag :color="noticeStateColor(record.processState)">
              {{ noticeStateText(record.processState) }}
            </a-tag>
            <div class="secondary">尝试 {{ record.processAttempts || 0 }} 次</div>
          </template>
          <template v-else-if="column.key === 'times'">
            <div>签名：{{ formatAppleTime(record.signedDate) }}</div>
            <div class="secondary">接收：{{ formatAppleTime(record.receivedAt) }}</div>
            <div class="secondary">完成：{{ formatAppleTime(record.processedAt) }}</div>
          </template>
          <template v-else-if="column.key === 'error'">
            <div>{{ record.lastErrorCode || '-' }}</div>
            <div class="secondary error-text">
              {{ safeAppleError(record.lastErrorMessage || '-') }}
            </div>
          </template>
          <template v-else-if="column.key === 'op'">
            <a-button
              v-if="canView"
              type="link"
              size="small"
              @click="notificationDetailRef.show(record.appleNotificationPk)"
            >
              详情
            </a-button>
            <span v-else>无详情权限</span>
          </template>
        </template>
      </a-table>
    </a-tab-pane>

    <a-tab-pane key="consumptions" tab="消费信息请求">
      <a-alert
        type="warning"
        show-icon
        class="section"
        message="消费同意状态只能来自 Link-U 用户证据，后台不提供人工改为同意"
      />
      <a-card class="section">
        <a-form layout="inline">
          <a-form-item label="环境">
            <a-select
              v-model:value="consumption.filters.environment"
              placeholder="全部"
              allow-clear
              style="width: 130px"
            >
              <a-select-option value="SANDBOX">Sandbox</a-select-option>
              <a-select-option value="PRODUCTION">Production</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="关键词">
            <a-input
              v-model:value="consumption.filters.keyword"
              :maxlength="100"
              allow-clear
              placeholder="交易/订单/生命周期事件"
            />
          </a-form-item>
          <a-form-item label="Apple 提交">
            <a-select
              v-model:value="consumption.filters.state"
              placeholder="全部"
              allow-clear
              style="width: 140px"
            >
              <a-select-option
                v-for="item in submitStateOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="用户同意">
            <a-select
              v-model:value="consumption.filters.secondaryState"
              placeholder="全部"
              allow-clear
              style="width: 130px"
            >
              <a-select-option
                v-for="item in consentStateOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="时间">
            <a-select v-model:value="consumption.filters.queryDateRange" style="width: 120px">
              <a-select-option value="near2now|7">近 7 天</a-select-option>
              <a-select-option value="near2now|30">近 30 天</a-select-option>
              <a-select-option value="near2now|90">近 90 天</a-select-option>
              <a-select-option value="">服务端默认 30 天</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item>
            <a-space>
              <a-button type="primary" @click="loadConsumptions(1)">查询</a-button>
              <a-button @click="resetConsumptions">重置</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </a-card>
      <a-alert
        v-if="consumption.error"
        type="error"
        show-icon
        :message="consumption.error"
        class="section"
      />
      <a-table
        :columns="consumptionColumns"
        :data-source="consumption.records"
        :loading="consumption.loading"
        :pagination="consumption.pagination"
        :scroll="{ x: 1500 }"
        row-key="consumptionRequestId"
        size="small"
        @change="consumptionTableChanged"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'ids'">
            <a-typography-paragraph :copyable="{ text: record.transactionId }" class="identifier">
              {{ record.transactionId || '-' }}
            </a-typography-paragraph>
            <div class="secondary">订单：{{ record.payOrderId || '-' }}</div>
          </template>
          <template v-else-if="column.key === 'deadline'">
            <a-tag :color="deadlineColor(record.responseDeadline)">
              {{ formatAppleTime(record.responseDeadline) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'states'">
            <div>
              <a-tag :color="consentColor(record.consentState)">
                {{ consentText(record.consentState) }}
              </a-tag>
            </div>
            <div>
              <a-tag :color="submitColor(record.appleSubmitState)">
                {{ submitText(record.appleSubmitState) }}
              </a-tag>
            </div>
            <div class="secondary">商户：{{ merchantNotifyText(record.merchantNotifyState) }}</div>
          </template>
          <template v-else-if="column.key === 'evidence'">
            {{ record.evidenceSha256 ? '有完整性摘要' : '无证据' }}
          </template>
          <template v-else-if="column.key === 'updatedAt'">
            {{ formatAppleTime(record.updatedAt) }}
          </template>
          <template v-else-if="column.key === 'op'">
            <a-button
              v-if="canView"
              type="link"
              size="small"
              @click="consumptionDetailRef.show(record.consumptionRequestId)"
            >
              详情
            </a-button>
            <span v-else>无详情权限</span>
          </template>
        </template>
      </a-table>
    </a-tab-pane>
  </a-tabs>
  <AppleIapNotificationDetail ref="notificationDetailRef" :mch-no="mchNo" :app-id="appId" />
  <AppleIapConsumptionDrawer ref="consumptionDetailRef" :mch-no="mchNo" :app-id="appId" />
</template>

<script setup lang="ts">
import { getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { appleIapOps } from '../appleIapOpsAdapter'
import { formatAppleTime, safeAppleError } from '../appleIapUiUtils'
import AppleIapConsumptionDrawer from './AppleIapConsumptionDrawer.vue'
import AppleIapNotificationDetail from './AppleIapNotificationDetail.vue'

const props = defineProps({
  mchNo: { type: String, default: '' },
  appId: { type: String, required: true },
})
const { $access } = getCurrentInstance()!.appContext.config.globalProperties
const canView = $access('ENT_APPLE_IAP_NOTICE_VIEW')
const notificationDetailRef = ref()
const consumptionDetailRef = ref()
const page = () => ({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100'],
})
const noticeDefaults = () => ({
  environment: undefined,
  type: '',
  transactionId: '',
  state: undefined,
  queryDateRange: 'near2now|30',
})
const consumptionDefaults = () => ({
  environment: undefined,
  keyword: '',
  state: undefined,
  secondaryState: undefined,
  queryDateRange: 'near2now|30',
})
const vdata: any = reactive({ active: 'notifications' })
const notice: any = reactive({
  loading: false,
  loaded: false,
  error: '',
  records: [],
  filters: noticeDefaults(),
  pagination: page(),
})
const consumption: any = reactive({
  loading: false,
  loaded: false,
  error: '',
  records: [],
  filters: consumptionDefaults(),
  pagination: page(),
})
const noticeStateOptions = options({
  0: '已接收',
  1: '处理中',
  2: '处理成功',
  3: '待重试',
  4: '死信',
  5: '忽略不支持',
})
const submitStateOptions = options({
  0: '等待商户',
  1: '无同意跳过',
  2: '待提交',
  3: '提交成功',
  4: '待重试',
  5: '死信',
})
const consentStateOptions = options({ 0: '未知', 1: '用户拒绝', 2: '用户同意' })
const noticeColumns = [
  { title: '环境', dataIndex: 'environment', key: 'environment', width: 110 },
  { title: 'notificationUUID', key: 'uuid', width: 270 },
  { title: '类型 / 子类型', key: 'type', width: 220 },
  { title: 'Apple Transaction ID', key: 'transactionId', width: 250 },
  { title: '处理状态', key: 'state', width: 130 },
  { title: '签名 / 接收 / 完成', key: 'times', width: 230 },
  { title: '错误摘要', key: 'error', width: 220 },
  { title: '操作', key: 'op', fixed: 'right', width: 90 },
]
const consumptionColumns = [
  { title: '环境', dataIndex: 'environment', key: 'environment', width: 110 },
  { title: '交易 / 订单', key: 'ids', width: 280 },
  { title: 'Apple 截止', key: 'deadline', width: 190 },
  { title: '同意 / 提交', key: 'states', width: 150 },
  { title: '证据', key: 'evidence', width: 130 },
  { title: '最近更新', key: 'updatedAt', width: 180 },
  { title: '操作', key: 'op', fixed: 'right', width: 90 },
]

onMounted(() => loadNotifications(1))
function tabChanged(key) {
  if (key === 'consumptions' && !consumption.loaded) loadConsumptions(1)
}
async function loadNotifications(current = 1) {
  notice.loading = true
  notice.error = ''
  try {
    const f = notice.filters
    const result = await appleIapOps.notifications(scope(), {
      pageNumber: current,
      pageSize: notice.pagination.pageSize,
      environment: f.environment,
      type: f.type.trim() || undefined,
      transactionId: f.transactionId.trim() || undefined,
      state: f.state,
      queryDateRange: f.queryDateRange || undefined,
    })
    notice.records = result.records || []
    notice.pagination.current = Number(result.current || current)
    notice.pagination.total = Number(result.total || 0)
    notice.loaded = true
  } catch (error: any) {
    notice.records = []
    notice.pagination.total = 0
    notice.error = '通知列表加载失败：' + safeAppleError(error)
  } finally {
    notice.loading = false
  }
}
async function loadConsumptions(current = 1) {
  consumption.loading = true
  consumption.error = ''
  try {
    const f = consumption.filters
    const result = await appleIapOps.consumptions(scope(), {
      pageNumber: current,
      pageSize: consumption.pagination.pageSize,
      environment: f.environment,
      keyword: f.keyword.trim() || undefined,
      state: f.state,
      secondaryState: f.secondaryState,
      queryDateRange: f.queryDateRange || undefined,
    })
    consumption.records = result.records || []
    consumption.pagination.current = Number(result.current || current)
    consumption.pagination.total = Number(result.total || 0)
    consumption.loaded = true
  } catch (error: any) {
    consumption.records = []
    consumption.pagination.total = 0
    consumption.error = '消费请求加载失败：' + safeAppleError(error)
  } finally {
    consumption.loading = false
  }
}
function resetNotifications() {
  notice.filters = noticeDefaults()
  loadNotifications(1)
}
function resetConsumptions() {
  consumption.filters = consumptionDefaults()
  loadConsumptions(1)
}
function noticeTableChanged(pagination) {
  notice.pagination.pageSize = pagination.pageSize
  loadNotifications(pagination.current)
}
function consumptionTableChanged(pagination) {
  consumption.pagination.pageSize = pagination.pageSize
  loadConsumptions(pagination.current)
}
function scope() {
  return { mchNo: props.mchNo, appId: props.appId }
}
function options(values) {
  return Object.entries(values).map(([value, label]) => ({ value, label }))
}
function noticeStateText(state) {
  return (
    { 0: '已接收', 1: '处理中', 2: '处理成功', 3: '待重试', 4: '死信', 5: '忽略不支持' }[
      Number(state)
    ] || `未知(${state ?? '-'})`
  )
}
function noticeStateColor(state) {
  return (
    { 0: 'default', 1: 'blue', 2: 'green', 3: 'orange', 4: 'red', 5: 'default' }[Number(state)] ||
    'default'
  )
}
function consentText(state) {
  return { 0: '未知', 1: '用户拒绝', 2: '用户同意' }[Number(state)] || `未知(${state ?? '-'})`
}
function consentColor(state) {
  return { 0: 'orange', 1: 'default', 2: 'green' }[Number(state)] || 'default'
}
function submitText(state) {
  return (
    { 0: '等待商户', 1: '无同意跳过', 2: '待提交', 3: '提交成功', 4: '待重试', 5: '死信' }[
      Number(state)
    ] || `未知(${state ?? '-'})`
  )
}
function submitColor(state) {
  return (
    { 0: 'orange', 1: 'default', 2: 'blue', 3: 'green', 4: 'orange', 5: 'red' }[Number(state)] ||
    'default'
  )
}
function merchantNotifyText(state) {
  return (
    { 0: '待通知', 1: '通知中', 2: '通知成功', 3: '通知失败' }[Number(state)] ||
    `未知(${state ?? '-'})`
  )
}
function deadlineColor(value) {
  if (!value) return 'default'
  const remaining = new Date(value).getTime() - Date.now()
  return !Number.isFinite(remaining) || remaining > 4 * 60 * 60 * 1000
    ? 'blue'
    : remaining > 0
      ? 'orange'
      : 'red'
}
</script>

<style lang="less" scoped>
.section {
  margin-bottom: 16px;
}
.identifier {
  margin-bottom: 0;
  max-width: 260px;
  overflow-wrap: anywhere;
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
