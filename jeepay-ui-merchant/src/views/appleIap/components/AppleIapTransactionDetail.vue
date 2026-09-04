<template>
  <a-drawer
    v-model:open="vdata.open"
    title="Apple IAP 交易详情"
    :width="920"
    :destroy-on-close="false"
  >
    <a-alert v-if="vdata.error" type="error" show-icon :message="vdata.error" class="section">
      <template #action><a-button size="small" @click="load">重试</a-button></template>
    </a-alert>
    <a-alert
      v-if="vdata.auditResult"
      type="success"
      show-icon
      class="section"
      :message="`动作已受理：${vdata.auditResult.resultCode || 'OK'}`"
      :description="`审计 ID：${vdata.auditResult.auditId || '-'}；结果引用：${vdata.auditResult.resultReference || '-'}；幂等命中：${vdata.auditResult.idempotent ? '是' : '否'}`"
    />
    <a-alert
      v-if="vdata.downloadAudit"
      type="success"
      show-icon
      class="section"
      :message="`交易 JWS 已受审计下载：${vdata.downloadAudit.fileName}`"
      :description="`审计 ID：${vdata.downloadAudit.auditId || '请从响应头/审计列表核对'}`"
    />

    <a-spin :spinning="vdata.loading">
      <template v-if="vdata.record">
        <a-space v-if="canRetry || canAccessPayload" wrap class="section">
          <a-button v-if="canRetryVerification" danger @click="openVerificationRetry">
            重试验证死信任务
          </a-button>
          <a-button v-if="canRetryFinish" danger @click="openFinishRetry">
            重试 Finish 死信任务
          </a-button>
          <a-button v-if="canAccessPayload" danger @click="openPayloadAccess">
            受审计下载原始交易 JWS
          </a-button>
          <span class="operation-note">后台不提供人工改为成功或人工发币入口。</span>
        </a-space>

        <a-descriptions bordered :column="2" size="small" class="section">
          <a-descriptions-item label="Jeepay 交易主键">
            {{ vdata.record.appleTransactionPk }}
          </a-descriptions-item>
          <a-descriptions-item label="环境">
            <a-tag :color="vdata.record.environment === 'PRODUCTION' ? 'blue' : 'orange'">
              {{ vdata.record.environment }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="Apple Transaction ID" :span="2">
            <a-typography-paragraph
              :copyable="{ text: vdata.record.transactionId }"
              class="identifier"
            >
              {{ vdata.record.transactionId || '-' }}
            </a-typography-paragraph>
          </a-descriptions-item>
          <a-descriptions-item label="Original Transaction ID" :span="2">
            <a-typography-paragraph
              :copyable="{ text: vdata.record.originalTransactionId }"
              class="identifier"
            >
              {{ vdata.record.originalTransactionId || '-' }}
            </a-typography-paragraph>
          </a-descriptions-item>
          <a-descriptions-item label="Jeepay 订单号">
            <a-typography-paragraph
              :copyable="{ text: vdata.record.payOrderId }"
              class="identifier"
            >
              {{ vdata.record.payOrderId || '-' }}
            </a-typography-paragraph>
          </a-descriptions-item>
          <a-descriptions-item label="商户订单号">
            <a-typography-paragraph
              :copyable="{ text: vdata.record.mchOrderNo }"
              class="identifier"
            >
              {{ vdata.record.mchOrderNo || '-' }}
            </a-typography-paragraph>
          </a-descriptions-item>
          <a-descriptions-item label="账户绑定线索">
            {{ vdata.record.accountTokenHint ? `…${vdata.record.accountTokenHint}` : '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="商品">
            {{ vdata.record.productId || '-' }} / {{ vdata.record.productType || '-' }} ×
            {{ vdata.record.quantity || 1 }}
          </a-descriptions-item>
          <a-descriptions-item label="渠道金额">
            {{
              formatScaledAmount(
                vdata.record.channelAmount,
                vdata.record.channelAmountScale,
                vdata.record.channelCurrency
              )
            }}
          </a-descriptions-item>
          <a-descriptions-item label="名义金额">
            {{ vdata.record.nominalAmount ?? '-' }}
            {{ String(vdata.record.nominalCurrency || '').toUpperCase() }}
            <span class="minor-unit">（最小货币单位）</span>
          </a-descriptions-item>
          <a-descriptions-item label="验证状态">
            <a-tag :color="stateColor('verification', vdata.record.verificationState)">
              {{ stateText('verification', vdata.record.verificationState) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="订单 / 通知">
            <a-tag :color="stateColor('order', vdata.record.payOrderState)">
              {{ stateText('order', vdata.record.payOrderState) }}
            </a-tag>
            <a-tag :color="Number(vdata.record.notifyState) === 1 ? 'green' : 'orange'">
              {{ Number(vdata.record.notifyState) === 1 ? '已通知' : '未通知' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="交付状态">
            <a-tag :color="stateColor('delivery', vdata.record.deliveryState)">
              {{ stateText('delivery', vdata.record.deliveryState) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="Finish 状态">
            <a-tag :color="stateColor('finish', vdata.record.finishState)">
              {{ stateText('finish', vdata.record.finishState) }}
            </a-tag>
            <span>尝试 {{ vdata.record.finishAttempts || 0 }} 次</span>
          </a-descriptions-item>
          <a-descriptions-item label="撤销 / 退款">
            <a-tag :color="vdata.record.revocationDate ? 'red' : 'default'">
              {{ vdata.record.revocationDate ? 'Apple 已撤销' : '未撤销' }}
            </a-tag>
            <a-tag :color="Number(vdata.record.refundState) > 0 ? 'purple' : 'default'">
              {{ stateText('refund', vdata.record.refundState) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="撤销详情">
            {{ formatAppleTime(vdata.record.revocationDate) }} /
            {{ vdata.record.revocationReason || '-' }} /
            {{ vdata.record.revocationPercentage ?? '-' }}%
          </a-descriptions-item>
          <a-descriptions-item label="Finish 下次重试">
            {{ formatAppleTime(vdata.record.finishNextRetryAt) }}
          </a-descriptions-item>
          <a-descriptions-item label="来源">
            {{ stateText('source', vdata.record.source) }}
          </a-descriptions-item>
          <a-descriptions-item label="Storefront">
            {{ vdata.record.storefront || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="JWS SHA-256" :span="2">
            <a-typography-paragraph :copyable="{ text: vdata.record.jwsSha256 }" class="identifier">
              {{ vdata.record.jwsSha256 || '-' }}
            </a-typography-paragraph>
            <span class="safety-note">仅展示摘要；原始 JWS 不进入普通详情 API。</span>
          </a-descriptions-item>
          <a-descriptions-item label="最后错误码">
            {{ vdata.record.lastErrorCode || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="最后错误">
            {{ safeAppleError(vdata.record.lastErrorMessage || '-') }}
          </a-descriptions-item>
        </a-descriptions>

        <a-divider orientation="left">状态时间线</a-divider>
        <a-timeline>
          <a-timeline-item v-for="item in timelineItems" :key="item.key" :color="item.color">
            <strong>{{ item.label }}</strong>
            ：{{ formatAppleTime(item.time) }}
          </a-timeline-item>
        </a-timeline>
      </template>
    </a-spin>
    <AppleIapActionModal ref="actionModalRef" @completed="actionCompleted" />
    <AppleIapPayloadAccessModal
      ref="payloadModalRef"
      :app-id="appId"
      @downloaded="payloadDownloaded"
    />
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, reactive, ref } from 'vue'
import {
  getAppleIapTransaction,
  retryAppleIapTransactionFinish,
  retryAppleIapTransactionVerification,
} from '@/api/manage'
import AppleIapActionModal from './AppleIapActionModal.vue'
import AppleIapPayloadAccessModal from './AppleIapPayloadAccessModal.vue'
import { formatAppleTime, formatScaledAmount, safeAppleError } from '../appleIapUiUtils'

const props = defineProps({ appId: { type: String, required: true } })
const emit = defineEmits(['changed'])
const { $access } = getCurrentInstance()!.appContext.config.globalProperties
const canRetry = $access('ENT_APPLE_IAP_JOB_RETRY')
const canAccessPayload = $access('ENT_APPLE_IAP_PAYLOAD_AUDIT')
const actionModalRef = ref()
const payloadModalRef = ref()
const vdata: any = reactive({
  open: false,
  loading: false,
  error: '',
  id: null,
  record: null,
  auditResult: null,
  downloadAudit: null,
})
const canRetryVerification = computed(
  () => canRetry && [3, 5].includes(Number(vdata.record && vdata.record.verificationState))
)
const canRetryFinish = computed(
  () => canRetry && Number(vdata.record && vdata.record.finishState) === 4
)
const timelineItems = computed(() => {
  const row = vdata.record || {}
  return [
    { key: 'created', label: 'Jeepay 接收交易', time: row.createdAt, color: 'blue' },
    { key: 'signed', label: 'Apple 签名时间', time: row.signedDate, color: 'blue' },
    { key: 'checked', label: '最近 Apple 校验', time: row.latestAppleCheckedAt, color: 'green' },
    { key: 'paid', label: 'Jeepay 订单成功', time: row.payOrderSuccessTime, color: 'green' },
    { key: 'delivered', label: 'Link-U 发币确认', time: row.deliveredAt, color: 'green' },
    { key: 'revoked', label: 'Apple 撤销', time: row.revocationDate, color: 'red' },
    { key: 'updated', label: '最近状态更新', time: row.updatedAt, color: 'gray' },
  ].filter((item) => item.time)
})

function show(id) {
  vdata.id = id
  vdata.record = null
  vdata.error = ''
  vdata.auditResult = null
  vdata.downloadAudit = null
  vdata.open = true
  load()
}
async function load() {
  if (!vdata.id) return
  vdata.loading = true
  vdata.error = ''
  try {
    vdata.record = await getAppleIapTransaction(props.appId, vdata.id)
  } catch (error: any) {
    vdata.error = '交易详情加载失败：' + safeAppleError(error)
  } finally {
    vdata.loading = false
  }
}
function openVerificationRetry() {
  actionModalRef.value.show({
    title: '重试交易验证死信任务',
    description: '仅当交易处于 RETRY 或 UNCLAIMED 且存在匹配的 DEAD 任务时受理；不会直接改为成功。',
    expectedState: 'DEAD',
    action: (data) => retryAppleIapTransactionVerification(props.appId, vdata.id, data),
  })
}
function openFinishRetry() {
  actionModalRef.value.show({
    title: '重试 Apple Finish 死信任务',
    description: '仅当 Finish 状态为 DEAD 且存在匹配死信任务时受理；不会绕过交付状态。',
    expectedState: 'DEAD',
    action: (data) => retryAppleIapTransactionFinish(props.appId, vdata.id, data),
  })
}
function openPayloadAccess() {
  payloadModalRef.value.show({
    targetType: 'TRANSACTION_JWS',
    targetId: vdata.record.appleTransactionPk,
    label: `交易 ${vdata.record.transactionId || vdata.record.appleTransactionPk}`,
  })
}
function payloadDownloaded(result) {
  vdata.downloadAudit = result
}
async function actionCompleted(result) {
  vdata.auditResult = result || {}
  await load()
  emit('changed')
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
  source: { 1: ['App 确认', 'blue'], 2: ['Apple 通知', 'purple'], 3: ['主动对账', 'cyan'] },
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

defineExpose({ show })
</script>

<style lang="less" scoped>
.section {
  margin-bottom: 16px;
}
.identifier {
  margin-bottom: 0;
  overflow-wrap: anywhere;
}
.minor-unit,
.safety-note,
.operation-note {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
