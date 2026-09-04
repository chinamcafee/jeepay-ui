<template>
  <div>
    <a-card class="section">
      <a-form layout="inline">
        <a-form-item label="环境">
          <a-select v-model:value="vdata.filters.environment" allow-clear style="width: 130px">
            <a-select-option value="SANDBOX">Sandbox</a-select-option>
            <a-select-option value="PRODUCTION">Production</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="关键词">
          <a-input
            v-model:value="vdata.filters.keyword"
            :maxlength="128"
            allow-clear
            placeholder="Apple / Jeepay / 商品 ID"
            @press-enter="search"
          />
        </a-form-item>
        <a-form-item label="Apple 交易 ID">
          <a-input v-model:value="vdata.filters.transactionId" :maxlength="128" allow-clear />
        </a-form-item>
        <a-form-item label="Jeepay 订单号">
          <a-input v-model:value="vdata.filters.payOrderId" :maxlength="64" allow-clear />
        </a-form-item>
        <a-form-item label="商户订单号">
          <a-input v-model:value="vdata.filters.mchOrderNo" :maxlength="128" allow-clear />
        </a-form-item>
        <a-form-item label="Apple 商品 ID">
          <a-input v-model:value="vdata.filters.productId" :maxlength="128" allow-clear />
        </a-form-item>
        <a-form-item label="验证">
          <a-select v-model:value="vdata.filters.state" allow-clear style="width: 130px">
            <a-select-option
              v-for="option in verificationOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="交付">
          <a-select v-model:value="vdata.filters.secondaryState" allow-clear style="width: 130px">
            <a-select-option
              v-for="option in deliveryOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Finish">
          <a-select v-model:value="vdata.filters.tertiaryState" allow-clear style="width: 140px">
            <a-select-option
              v-for="option in finishOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="撤销">
          <a-select v-model:value="vdata.filters.revoked" style="width: 120px">
            <a-select-option value="ALL">全部</a-select-option>
            <a-select-option value="YES">已撤销</a-select-option>
            <a-select-option value="NO">未撤销</a-select-option>
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
            <a-button type="primary" @click="search">查询</a-button>
            <a-button @click="reset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-alert v-if="vdata.error" type="error" show-icon :message="vdata.error" class="section">
      <template #action>
        <a-button size="small" @click="load(vdata.pagination.current)">重试</a-button>
      </template>
    </a-alert>
    <a-table
      :columns="columns"
      :data-source="vdata.records"
      :loading="vdata.loading"
      :pagination="vdata.pagination"
      :scroll="{ x: 2200 }"
      row-key="appleTransactionPk"
      size="small"
      @change="tableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'appleIds'">
          <a-typography-paragraph :copyable="{ text: record.transactionId }" class="identifier">
            {{ record.transactionId || '-' }}
          </a-typography-paragraph>
          <a-typography-paragraph
            :copyable="{ text: record.originalTransactionId }"
            class="secondary-id copyable-secondary"
          >
            原始：{{ record.originalTransactionId || '-' }}
          </a-typography-paragraph>
        </template>
        <template v-else-if="column.key === 'orderIds'">
          <a-typography-paragraph :copyable="{ text: record.payOrderId }" class="identifier">
            {{ record.payOrderId || '-' }}
          </a-typography-paragraph>
          <a-typography-paragraph
            :copyable="{ text: record.mchOrderNo }"
            class="secondary-id copyable-secondary"
          >
            商户：{{ record.mchOrderNo || '-' }}
          </a-typography-paragraph>
        </template>
        <template v-else-if="column.key === 'product'">
          <div>{{ record.productId || '-' }} × {{ record.quantity || 1 }}</div>
          <div class="secondary-id">{{ record.productType || '-' }}</div>
        </template>
        <template v-else-if="column.key === 'amounts'">
          <div>
            渠道：{{
              formatScaledAmount(
                record.channelAmount,
                record.channelAmountScale,
                record.channelCurrency
              )
            }}
          </div>
          <div class="secondary-id">
            名义：{{ record.nominalAmount ?? '-' }}
            {{ String(record.nominalCurrency || '').toUpperCase() }}
          </div>
        </template>
        <template v-else-if="column.key === 'states'">
          <div>
            <a-tag :color="stateColor('verification', record.verificationState)">
              {{ stateText('verification', record.verificationState) }}
            </a-tag>
          </div>
          <div>
            <a-tag :color="stateColor('delivery', record.deliveryState)">
              {{ stateText('delivery', record.deliveryState) }}
            </a-tag>
          </div>
          <div>
            <a-tag :color="stateColor('finish', record.finishState)">
              {{ stateText('finish', record.finishState) }}
            </a-tag>
          </div>
        </template>
        <template v-else-if="column.key === 'flow'">
          <div>
            <a-tag :color="stateColor('order', record.payOrderState)">
              {{ stateText('order', record.payOrderState) }}
            </a-tag>
          </div>
          <div>
            <a-tag :color="Number(record.notifyState) === 1 ? 'green' : 'orange'">
              {{ Number(record.notifyState) === 1 ? '已通知' : '未通知' }}
            </a-tag>
          </div>
          <div>
            <a-tag :color="record.revocationDate ? 'red' : 'default'">
              {{ record.revocationDate ? '已撤销' : '未撤销' }}
            </a-tag>
          </div>
          <div>
            <a-tag :color="stateColor('refund', record.refundState)">
              {{ stateText('refund', record.refundState) }}
            </a-tag>
          </div>
        </template>
        <template v-else-if="column.key === 'accountTokenHint'">
          {{ record.accountTokenHint ? `…${record.accountTokenHint}` : '-' }}
        </template>
        <template v-else-if="column.key === 'times'">
          <div>购买：{{ formatAppleTime(record.purchaseDate) }}</div>
          <div class="secondary-id">接收：{{ formatAppleTime(record.createdAt) }}</div>
          <div class="secondary-id">校验：{{ formatAppleTime(record.latestAppleCheckedAt) }}</div>
        </template>
        <template v-else-if="column.key === 'source'">
          {{ sourceText(record.source) }}
        </template>
        <template v-else-if="column.key === 'op'">
          <a-button
            v-if="canView"
            type="link"
            size="small"
            @click="detailRef.show(record.appleTransactionPk)"
          >
            详情
          </a-button>
          <span v-else>无详情权限</span>
        </template>
      </template>
    </a-table>
    <AppleIapTransactionDetail
      ref="detailRef"
      :mch-no="mchNo"
      :app-id="appId"
      @changed="load(vdata.pagination.current)"
    />
  </div>
</template>

<script setup lang="ts">
import { getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { listAppleIapTransactions } from '@/api/manage'
import AppleIapTransactionDetail from './AppleIapTransactionDetail.vue'
import { formatAppleTime, formatScaledAmount, safeAppleError } from '../appleIapUiUtils'

const props = defineProps({
  mchNo: { type: String, required: true },
  appId: { type: String, required: true },
  initialTransactionId: { type: String, default: '' },
  initialPayOrderId: { type: String, default: '' },
})
const { $access } = getCurrentInstance()!.appContext.config.globalProperties
const canView = $access('ENT_APPLE_IAP_TX_VIEW')
const detailRef = ref()
const verificationOptions = options({
  0: '已接收',
  1: 'JWS 有效',
  2: 'Apple 已验证',
  3: '待重试',
  4: '已拒绝',
  5: '未认领',
})
const deliveryOptions = options({ 1: '待发放', 2: '已发放', 3: '发放失败' })
const finishOptions = options({
  0: '无需 Finish',
  1: '待 Finish',
  2: 'Finish 成功',
  3: '重试中',
  4: '死信',
})
const columns = [
  { title: '环境', dataIndex: 'environment', key: 'environment', width: 115 },
  { title: 'Apple 交易', key: 'appleIds', width: 290 },
  { title: 'Jeepay / 商户订单', key: 'orderIds', width: 240 },
  { title: '账户线索', key: 'accountTokenHint', width: 120 },
  { title: '商品', key: 'product', width: 260 },
  { title: '金额', key: 'amounts', width: 210 },
  { title: '验证 / 交付 / Finish', key: 'states', width: 170 },
  { title: '订单 / 通知 / 撤销', key: 'flow', width: 150 },
  { title: '来源', dataIndex: 'source', key: 'source', width: 80 },
  { title: '购买 / 接收 / 校验时间', key: 'times', width: 220 },
  { title: '操作', key: 'op', fixed: 'right', width: 100 },
]
const defaultFilters = () => ({
  environment: undefined,
  keyword: '',
  transactionId: props.initialTransactionId,
  payOrderId: props.initialPayOrderId,
  mchOrderNo: '',
  productId: '',
  state: undefined,
  secondaryState: undefined,
  tertiaryState: undefined,
  revoked: 'ALL',
  queryDateRange: 'near2now|30',
})
const vdata: any = reactive({
  loading: false,
  error: '',
  records: [],
  filters: defaultFilters(),
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
  },
})

onMounted(async () => {
  await load(1)
  if (
    canView &&
    (props.initialTransactionId || props.initialPayOrderId) &&
    vdata.records.length === 1
  ) {
    detailRef.value.show(vdata.records[0].appleTransactionPk)
  }
})
async function load(page = 1) {
  vdata.loading = true
  vdata.error = ''
  try {
    const filters = vdata.filters
    const result = await listAppleIapTransactions(props.mchNo, props.appId, {
      pageNumber: page,
      pageSize: vdata.pagination.pageSize,
      environment: filters.environment,
      keyword: filters.keyword.trim() || undefined,
      transactionId: filters.transactionId.trim() || undefined,
      payOrderId: filters.payOrderId.trim() || undefined,
      mchOrderNo: filters.mchOrderNo.trim() || undefined,
      productId: filters.productId.trim() || undefined,
      state: filters.state,
      secondaryState: filters.secondaryState,
      tertiaryState: filters.tertiaryState,
      revoked: filters.revoked === 'ALL' ? undefined : filters.revoked === 'YES',
      queryDateRange: filters.queryDateRange || undefined,
    })
    vdata.records = result.records || []
    vdata.pagination.current = Number(result.current || page)
    vdata.pagination.total = Number(result.total || 0)
  } catch (error: any) {
    vdata.records = []
    vdata.pagination.total = 0
    vdata.error = '交易列表加载失败：' + safeAppleError(error)
  } finally {
    vdata.loading = false
  }
}
function search() {
  load(1)
}
function reset() {
  vdata.filters = defaultFilters()
  load(1)
}
function tableChange(pagination) {
  vdata.pagination.pageSize = pagination.pageSize
  load(pagination.current)
}
function options(values) {
  return Object.entries(values).map(([value, label]) => ({ value, label }))
}

const stateMaps: any = {
  verification: {
    0: ['已接收', 'default'],
    1: ['JWS 有效', 'blue'],
    2: ['Apple 已验证', 'green'],
    3: ['待重试', 'orange'],
    4: ['已拒绝', 'red'],
    5: ['未认领', 'volcano'],
  },
  delivery: { 1: ['待发放', 'orange'], 2: ['已发放', 'green'], 3: ['发放失败', 'red'] },
  finish: {
    0: ['无需 Finish', 'default'],
    1: ['待 Finish', 'orange'],
    2: ['Finish 成功', 'green'],
    3: ['Finish 重试中', 'orange'],
    4: ['Finish 死信', 'red'],
  },
  order: {
    0: ['订单初始', 'default'],
    1: ['支付中', 'blue'],
    2: ['订单成功', 'green'],
    3: ['订单失败', 'red'],
    4: ['订单取消', 'default'],
    5: ['已退款', 'purple'],
    6: ['订单关闭', 'default'],
  },
  refund: { 0: ['未退款', 'default'], 1: ['部分退款', 'purple'], 2: ['全额退款', 'purple'] },
}
function stateText(kind, state) {
  return (
    (stateMaps[kind] && stateMaps[kind][Number(state)] && stateMaps[kind][Number(state)][0]) ||
    `未知(${state ?? '-'})`
  )
}
function stateColor(kind, state) {
  return (
    (stateMaps[kind] && stateMaps[kind][Number(state)] && stateMaps[kind][Number(state)][1]) ||
    'default'
  )
}
function sourceText(source) {
  return (
    { 1: 'APP_CONFIRM', 2: 'APPLE_NOTIFICATION', 3: 'RECONCILIATION' }[Number(source)] ||
    `UNKNOWN(${source ?? '-'})`
  )
}
</script>

<style lang="less" scoped>
.section {
  margin-bottom: 16px;
}
.identifier {
  margin-bottom: 0;
  max-width: 270px;
  overflow-wrap: anywhere;
}
.secondary-id {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.copyable-secondary {
  margin-bottom: 0;
}
</style>
