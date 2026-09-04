<template>
  <a-drawer v-model:open="vdata.open" title="Apple 消费信息请求" :width="820">
    <a-alert v-if="vdata.error" type="error" show-icon :message="vdata.error" class="section">
      <template #action><a-button size="small" @click="load">重试</a-button></template>
    </a-alert>
    <a-alert
      v-if="vdata.downloadAudit"
      type="success"
      show-icon
      class="section"
      :message="`消费证据已下载：${vdata.downloadAudit.fileName}`"
      :description="`审计 ID：${vdata.downloadAudit.auditId || '请从响应头/审计列表核对'}`"
    />
    <a-spin :spinning="vdata.loading">
      <template v-if="vdata.record">
        <a-alert
          :type="deadlineAlert.type"
          show-icon
          class="section"
          :message="deadlineAlert.message"
          :description="`Apple 截止时间：${formatAppleTime(vdata.record.responseDeadline)}`"
        />
        <a-space class="section" wrap>
          <a-button
            v-if="canAccessPayload && vdata.record.evidenceSha256"
            danger
            @click="downloadEvidence"
          >
            受审计下载消费证据
          </a-button>
          <span class="safety-note">后台只读展示同意事实，不能人工把 consent 改为同意。</span>
        </a-space>
        <a-descriptions bordered :column="2" size="small">
          <a-descriptions-item label="请求主键">
            {{ vdata.record.consumptionRequestId }}
          </a-descriptions-item>
          <a-descriptions-item label="环境">
            {{ vdata.record.environment || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="Apple Transaction ID" :span="2">
            <a-typography-paragraph
              :copyable="{ text: vdata.record.transactionId }"
              class="identifier"
            >
              {{ vdata.record.transactionId || '-' }}
            </a-typography-paragraph>
          </a-descriptions-item>
          <a-descriptions-item label="Jeepay 订单号">
            {{ vdata.record.payOrderId || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="生命周期事件">
            {{ vdata.record.lifecycleEventId || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="商户通知">
            <a-tag :color="merchantNotifyColor(vdata.record.merchantNotifyState)">
              {{ merchantNotifyText(vdata.record.merchantNotifyState) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="用户同意">
            <a-tag :color="consentColor(vdata.record.consentState)">
              {{ consentText(vdata.record.consentState) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="Apple 提交">
            <a-tag :color="submitColor(vdata.record.appleSubmitState)">
              {{ submitText(vdata.record.appleSubmitState) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="Apple HTTP">
            {{ vdata.record.appleHttpStatus ?? '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="证据 SHA-256" :span="2">
            <a-typography-paragraph
              :copyable="{ text: vdata.record.evidenceSha256 }"
              class="identifier"
            >
              {{ vdata.record.evidenceSha256 || '-' }}
            </a-typography-paragraph>
          </a-descriptions-item>
          <a-descriptions-item label="商户回应">
            {{ formatAppleTime(vdata.record.merchantRespondedAt) }}
          </a-descriptions-item>
          <a-descriptions-item label="提交 Apple">
            {{ formatAppleTime(vdata.record.appleSubmittedAt) }}
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
      :mch-no="mchNo"
      :app-id="appId"
      @downloaded="payloadDownloaded"
    />
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, reactive, ref } from 'vue'
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
const deadlineAlert = computed(() => {
  const rawDeadline = vdata.record && vdata.record.responseDeadline
  if (!rawDeadline) return { type: 'info', message: 'Apple 截止时间未知' }
  const deadline = new Date(rawDeadline).getTime()
  if (!Number.isFinite(deadline)) return { type: 'info', message: 'Apple 截止时间未知' }
  const remaining = deadline - Date.now()
  if (remaining <= 0) return { type: 'error', message: 'Apple 响应截止时间已过' }
  if (remaining <= 4 * 60 * 60 * 1000)
    return { type: 'warning', message: 'Apple 响应截止时间不足 4 小时' }
  return { type: 'info', message: '消费信息请求仍在响应窗口内' }
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
    vdata.record = await appleIapOps.consumption(
      { mchNo: props.mchNo, appId: props.appId },
      vdata.id
    )
  } catch (error: any) {
    vdata.error = '消费请求详情加载失败：' + safeAppleError(error)
  } finally {
    vdata.loading = false
  }
}
function downloadEvidence() {
  payloadModalRef.value.show({
    targetType: 'CONSUMPTION_EVIDENCE',
    targetId: vdata.record.consumptionRequestId,
    label: `消费请求 ${vdata.record.consumptionRequestId}`,
  })
}
function payloadDownloaded(result) {
  vdata.downloadAudit = result
}
function merchantNotifyText(state) {
  return (
    { 0: '待通知', 1: '通知中', 2: '通知成功', 3: '通知失败' }[Number(state)] ||
    `未知(${state ?? '-'})`
  )
}
function merchantNotifyColor(state) {
  return { 0: 'orange', 1: 'blue', 2: 'green', 3: 'red' }[Number(state)] || 'default'
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
