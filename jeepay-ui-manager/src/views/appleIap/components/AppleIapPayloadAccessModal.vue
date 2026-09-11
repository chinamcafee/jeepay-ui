<template>
  <a-modal wrap-class-name="apple-iap-ui apple-iap-dialog"
    v-model:open="vdata.open"
    title="受审计下载 Apple 敏感载荷"
    :confirm-loading="vdata.loading"
    :mask-closable="false"
    ok-text="确认并下载"
    @ok="submit"
    @cancel="close"
  >
    <a-alert
      type="error"
      show-icon
      class="section"
      message="下载内容可能包含原始 Apple 证明，仅用于获批排障"
      description="服务端会验证租户、权限、密文完整性并追加防篡改审计。页面不渲染内容，对象 URL 会在触发下载后撤销；下载文件仍需按公司敏感数据制度处置。"
    />
    <a-alert v-if="vdata.error" type="error" show-icon :message="vdata.error" class="section" />
    <a-descriptions bordered :column="1" size="small" class="section">
      <a-descriptions-item label="目标">{{ vdata.label || '-' }}</a-descriptions-item>
      <a-descriptions-item label="载荷类型">{{ vdata.form.targetType || '-' }}</a-descriptions-item>
      <a-descriptions-item label="内部主键">{{ vdata.form.targetId || '-' }}</a-descriptions-item>
    </a-descriptions>
    <a-form ref="formRef" :model="vdata.form" :rules="rules" layout="vertical">
      <a-form-item label="访问原因" name="reason">
        <a-textarea
          v-model:value="vdata.form.reason"
          :rows="4"
          :maxlength="500"
          placeholder="至少 8 个字符，将写入防篡改审计链"
        />
      </a-form-item>
    </a-form>
    <div class="idempotency">幂等键：{{ vdata.form.idempotencyKey || '-' }}（失败后保持不变）</div>
  </a-modal>
</template>

<script setup lang="ts">
import { getCurrentInstance, reactive, ref } from 'vue'
import { appleIapOps } from '../appleIapOpsAdapter'
import {
  newAppleIdempotencyKey,
  releaseApplePayloadDownload,
  safeAppleError,
} from '../appleIapUiUtils'

const props = defineProps({
  mchNo: { type: String, required: true },
  appId: { type: String, required: true },
})
const { $access } = getCurrentInstance()!.appContext.config.globalProperties
const canAccessPayload = $access('ENT_APPLE_IAP_PAYLOAD_AUDIT')
const emit = defineEmits(['downloaded'])
const formRef = ref()
const vdata: any = reactive({
  open: false,
  loading: false,
  error: '',
  label: '',
  form: { targetType: '', targetId: null, reason: '', idempotencyKey: '' },
})
const rules = {
  reason: [
    { required: true, message: '请输入访问原因', trigger: 'blur' },
    { min: 8, max: 500, message: '访问原因必须为 8～500 个字符', trigger: 'blur' },
  ],
}

function show(options) {
  if (!canAccessPayload) throw new Error('当前账号没有敏感载荷审计权限')
  vdata.label = options.label
  vdata.error = ''
  vdata.form = {
    targetType: options.targetType,
    targetId: options.targetId,
    reason: '',
    idempotencyKey: newAppleIdempotencyKey(),
  }
  vdata.open = true
}
async function submit() {
  if (!canAccessPayload) {
    vdata.error = '当前账号没有敏感载荷审计权限'
    return
  }
  try {
    await formRef.value.validate()
  } catch (_) {
    return
  }
  vdata.loading = true
  vdata.error = ''
  let completed: any = null
  try {
    const response = await appleIapOps.downloadPayload(
      { mchNo: props.mchNo, appId: props.appId },
      { ...vdata.form, reason: vdata.form.reason.trim() }
    )
    completed = releaseApplePayloadDownload(response)
    emit('downloaded', completed)
  } catch (error: any) {
    vdata.error = '敏感载荷下载失败：' + safeAppleError(error)
  } finally {
    vdata.loading = false
    if (completed) close()
  }
}
function close() {
  if (vdata.loading) return
  vdata.open = false
  vdata.error = ''
  vdata.label = ''
  vdata.form = { targetType: '', targetId: null, reason: '', idempotencyKey: '' }
}

defineExpose({ show })
</script>

<style lang="less" scoped>
.section {
  margin-bottom: 16px;
}
.idempotency {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  overflow-wrap: anywhere;
}
</style>
