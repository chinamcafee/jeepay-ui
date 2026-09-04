<template>
  <a-form ref="formRef" :model="local" :rules="rules" layout="vertical">
    <a-row :gutter="16">
      <a-col :xs="24" :md="12">
        <a-form-item label="Bundle ID" name="bundleId">
          <a-input
            v-model:value="local.bundleId"
            :disabled="disabled"
            :maxlength="255"
            placeholder="tech.wenchuan.linku.mobile"
          />
        </a-form-item>
      </a-col>
      <a-col :xs="24" :md="12">
        <a-form-item label="App Apple ID" name="appAppleId">
          <a-input-number
            v-model:value="local.appAppleId"
            :disabled="disabled"
            :min="1"
            :precision="0"
            style="width: 100%"
            placeholder="生产环境必填"
          />
        </a-form-item>
      </a-col>
      <a-col :xs="24" :md="12">
        <a-form-item label="可用环境" name="sandboxEnabled">
          <a-space>
            <a-checkbox v-model:checked="local.sandboxEnabled" :disabled="disabled">
              Sandbox
            </a-checkbox>
            <a-checkbox v-model:checked="local.productionEnabled" :disabled="disabled">
              Production
            </a-checkbox>
          </a-space>
        </a-form-item>
      </a-col>
      <a-col :xs="24" :md="12">
        <a-form-item label="Apple API 超时（毫秒）" name="apiTimeoutMs">
          <a-input-number
            v-model:value="local.apiTimeoutMs"
            :disabled="disabled"
            :min="500"
            :max="30000"
            :precision="0"
            style="width: 100%"
          />
        </a-form-item>
      </a-col>
      <a-col :span="24">
        <a-form-item label="配置状态" name="enabled">
          <a-radio-group v-model:value="local.enabled" :disabled="disabled">
            <a-radio :value="false">停用</a-radio>
            <a-radio :value="true" :disabled="!canEnable">启用</a-radio>
          </a-radio-group>
          <div v-if="!canEnable" class="field-help">
            只有 readiness=READY 且审核通过后才可启用。
          </div>
        </a-form-item>
      </a-col>
    </a-row>
  </a-form>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

const props = defineProps({
  model: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
  canEnable: { type: Boolean, default: false },
})
const emit = defineEmits(['update:model'])
const formRef = ref()
const local: any = reactive({
  bundleId: '',
  appAppleId: null,
  sandboxEnabled: true,
  productionEnabled: false,
  apiTimeoutMs: 5000,
  enabled: false,
})
let syncing = false

watch(
  () => props.model,
  (value) => {
    syncing = true
    Object.assign(local, value || {})
    syncing = false
  },
  { deep: true, immediate: true }
)
watch(
  local,
  (value) => {
    if (!syncing) emit('update:model', Object.assign({}, props.model, value))
  },
  { deep: true }
)

const rules = {
  bundleId: [
    { required: true, message: '请输入 Bundle ID', trigger: 'blur' },
    {
      pattern: /^(?!.*\.\.)(?=.{1,255}$)[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9-])?\.[A-Za-z0-9-]+$/,
      message: 'Bundle ID 格式不正确',
      trigger: 'blur',
    },
  ],
  appAppleId: [
    {
      validator: () =>
        local.productionEnabled && (!local.appAppleId || local.appAppleId < 1)
          ? Promise.reject('Production 环境必须填写 App Apple ID')
          : Promise.resolve(),
      trigger: 'change',
    },
  ],
  apiTimeoutMs: [{ required: true, message: '请输入 API 超时', trigger: 'change' }],
  sandboxEnabled: [
    {
      validator: () =>
        !local.sandboxEnabled && !local.productionEnabled
          ? Promise.reject('至少启用一个环境')
          : Promise.resolve(),
      trigger: 'change',
    },
  ],
}

function validate() {
  return formRef.value.validate()
}

defineExpose({ validate })
</script>

<style lang="less" scoped>
.field-help {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  margin-top: 4px;
}
</style>
