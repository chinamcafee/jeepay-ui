<template>
  <a-modal wrap-class-name="apple-iap-ui apple-iap-dialog"
    v-model:open="vdata.open"
    :title="vdata.title"
    :confirm-loading="vdata.loading"
    :mask-closable="false"
    ok-text="确认执行"
    @ok="submit"
    @cancel="close"
  >
    <a-alert type="warning" show-icon :message="vdata.description" class="section" />
    <a-alert v-if="vdata.error" type="error" show-icon :message="vdata.error" class="section" />
    <a-form ref="formRef" :model="vdata.form" :rules="rules" layout="vertical">
      <a-form-item label="操作原因" name="reason">
        <a-textarea
          v-model:value="vdata.form.reason"
          :rows="4"
          :maxlength="500"
          placeholder="至少 8 个字符，将写入防篡改审计链"
        />
      </a-form-item>
    </a-form>
    <div class="idempotency">
      幂等键：{{ vdata.form.idempotencyKey || '-' }}（请求失败后保持不变）
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { newAppleIdempotencyKey, safeAppleError } from '../appleIapUiUtils'

const emit = defineEmits(['completed'])
const formRef = ref()
let action: any = null
const vdata: any = reactive({
  open: false,
  title: '',
  description: '',
  loading: false,
  error: '',
  form: { reason: '', idempotencyKey: '', expectedState: '' },
})
const rules = {
  reason: [
    { required: true, message: '请输入操作原因', trigger: 'blur' },
    { min: 8, max: 500, message: '操作原因必须为 8～500 个字符', trigger: 'blur' },
  ],
}

function show(options: any) {
  vdata.title = options.title
  vdata.description = options.description
  vdata.error = ''
  vdata.form = {
    reason: '',
    idempotencyKey: newAppleIdempotencyKey(),
    expectedState: options.expectedState,
  }
  action = options.action
  vdata.open = true
}

async function submit() {
  try {
    await formRef.value.validate()
  } catch (_) {
    return
  }
  vdata.loading = true
  vdata.error = ''
  let completed = false
  try {
    const result = await action({ ...vdata.form, reason: vdata.form.reason.trim() })
    emit('completed', result)
    completed = true
  } catch (error: any) {
    vdata.error = '操作失败：' + safeAppleError(error)
  } finally {
    vdata.loading = false
    if (completed) close()
  }
}

function close() {
  if (vdata.loading) return
  vdata.open = false
  vdata.error = ''
  action = null
  vdata.form = { reason: '', idempotencyKey: '', expectedState: '' }
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
