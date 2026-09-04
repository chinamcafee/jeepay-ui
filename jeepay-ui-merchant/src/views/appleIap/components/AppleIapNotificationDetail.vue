<template>
  <a-drawer v-model:open="vdata.open" title="Apple 通知详情" :width="820">
    <a-alert v-if="vdata.error" type="error" show-icon :message="vdata.error" class="section">
      <template #action><a-button size="small" @click="load">重试</a-button></template>
    </a-alert>
    <a-alert
      v-if="vdata.downloadAudit"
      type="success"
      show-icon
      class="section"
      :message="`敏感载荷已下载：${vdata.downloadAudit.fileName}`"
      :description="`审计 ID：${vdata.downloadAudit.auditId || '请从响应头/审计列表核对'}`"
    />
    <a-spin :spinning="vdata.loading">
      <template v-if="vdata.record">
        <a-space class="section" wrap>
          <a-tag :color="processColor(vdata.record.processState)">
            {{ processText(vdata.record.processState) }}
          </a-tag>
          <a-button v-if="canAccessPayload" danger @click="downloadPayload">
            受审计下载原始通知载荷
          </a-button>
        </a-space>
        <a-descriptions bordered :column="2" size="small">
          <a-descriptions-item label="内部主键">
            {{ vdata.record.appleNotificationPk }}
          </a-descriptions-item>
          <a-descriptions-item label="环境">
            {{ vdata.record.environment || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="notificationUUID" :span="2">
            <a-typography-paragraph
              :copyable="{ text: vdata.record.notificationUuid }"
              class="identifier"
            >
              {{ vdata.record.notificationUuid || '-' }}
            </a-typography-paragraph>
          </a-descriptions-item>
          <a-descriptions-item label="类型">
            {{ vdata.record.notificationType || '-' }} /
            {{ vdata.record.notificationSubtype || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="版本">
            {{ vdata.record.notificationVersion || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="Apple Transaction ID" :span="2">
            <a-typography-paragraph
              :copyable="{ text: vdata.record.transactionId }"
              class="identifier"
            >
              {{ vdata.record.transactionId || '-' }}
            </a-typography-paragraph>
          </a-descriptions-item>
          <a-descriptions-item label="Payload SHA-256" :span="2">
            <a-typography-paragraph
              :copyable="{ text: vdata.record.payloadSha256 }"
              class="identifier"
            >
              {{ vdata.record.payloadSha256 || '-' }}
            </a-typography-paragraph>
            <span class="safety-note">普通详情仅展示摘要，不渲染 signedPayload。</span>
          </a-descriptions-item>
          <a-descriptions-item label="处理状态">
            {{ processText(vdata.record.processState) }}
          </a-descriptions-item>
          <a-descriptions-item label="处理尝试">
            {{ vdata.record.processAttempts || 0 }}
          </a-descriptions-item>
          <a-descriptions-item label="Apple 签名时间">
            {{ formatAppleTime(vdata.record.signedDate) }}
          </a-descriptions-item>
          <a-descriptions-item label="Jeepay 接收时间">
            {{ formatAppleTime(vdata.record.receivedAt) }}
          </a-descriptions-item>
          <a-descriptions-item label="下次重试">
            {{ formatAppleTime(vdata.record.nextRetryAt) }}
          </a-descriptions-item>
          <a-descriptions-item label="处理完成">
            {{ formatAppleTime(vdata.record.processedAt) }}
          </a-descriptions-item>
          <a-descriptions-item label="最后错误码">
            {{ vdata.record.lastErrorCode || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="最后错误">
            {{ safeAppleError(vdata.record.lastErrorMessage || '-') }}
          </a-descriptions-item>
        </a-descriptions>
      </template>
    </a-spin>
    <AppleIapPayloadAccessModal
      ref="payloadModalRef"
      :app-id="appId"
      @downloaded="payloadDownloaded"
    />
  </a-drawer>
</template>

<script setup lang="ts">
import { getCurrentInstance, reactive, ref } from 'vue'
import { appleIapOps } from '../appleIapOpsAdapter'
import { formatAppleTime, safeAppleError } from '../appleIapUiUtils'
import AppleIapPayloadAccessModal from './AppleIapPayloadAccessModal.vue'

const props = defineProps({
  mchNo: { type: String, default: '' },
  appId: { type: String, required: true },
})
const { $access } = getCurrentInstance()!.appContext.config.globalProperties
const canAccessPayload = $access('ENT_APPLE_IAP_PAYLOAD_AUDIT')
const payloadModalRef = ref()
const vdata: any = reactive({
  open: false,
  loading: false,
  error: '',
  id: null,
  record: null,
  downloadAudit: null,
})

function show(id) {
  vdata.id = id
  vdata.record = null
  vdata.error = ''
  vdata.downloadAudit = null
  vdata.open = true
  load()
}
async function load() {
  if (!vdata.id) return
  vdata.loading = true
  vdata.error = ''
  try {
    vdata.record = await appleIapOps.notification(
      { mchNo: props.mchNo, appId: props.appId },
      vdata.id
    )
  } catch (error: any) {
    vdata.error = '通知详情加载失败：' + safeAppleError(error)
  } finally {
    vdata.loading = false
  }
}
function downloadPayload() {
  payloadModalRef.value.show({
    targetType: 'NOTIFICATION_PAYLOAD',
    targetId: vdata.record.appleNotificationPk,
    label: `通知 ${vdata.record.notificationUuid || vdata.record.appleNotificationPk}`,
  })
}
function payloadDownloaded(result) {
  vdata.downloadAudit = result
}
function processText(state) {
  return (
    { 0: '已接收', 1: '处理中', 2: '处理成功', 3: '待重试', 4: '死信', 5: '忽略不支持' }[
      Number(state)
    ] || `未知(${state ?? '-'})`
  )
}
function processColor(state) {
  return (
    { 0: 'default', 1: 'blue', 2: 'green', 3: 'orange', 4: 'red', 5: 'default' }[Number(state)] ||
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
.safety-note {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
