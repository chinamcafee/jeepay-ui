<template>
  <div>
    <a-alert
      type="warning"
      show-icon
      message="P8 私钥只在本次请求内存中短暂存在，不会写入浏览器存储或回显。"
      class="section-alert"
    />
    <a-descriptions bordered size="small" :column="1" class="key-status">
      <a-descriptions-item label="当前状态">
        <a-tag :color="privateKey.configured ? 'green' : 'orange'">
          {{ privateKey.configured ? '已配置' : '未配置' }}
        </a-tag>
      </a-descriptions-item>
      <a-descriptions-item label="指纹">{{ privateKey.fingerprint || '-' }}</a-descriptions-item>
      <a-descriptions-item label="版本">{{ privateKey.version || '-' }}</a-descriptions-item>
    </a-descriptions>
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-row :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item label="Issuer ID" name="issuerId">
            <a-input
              v-model:value="form.issuerId"
              :disabled="disabled"
              placeholder="完整 UUID；保存后仅显示掩码"
            />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-form-item label="Key ID" name="keyId">
            <a-input
              v-model:value="form.keyId"
              :disabled="disabled"
              :maxlength="10"
              placeholder="10 位大写字母或数字"
            />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="AuthKey_*.p8" name="p8File">
            <a-upload
              accept=".p8,application/octet-stream"
              :before-upload="selectFile"
              :file-list="fileList"
              :max-count="1"
              :disabled="disabled"
              @remove="clearSecretSelection"
            >
              <a-button :disabled="disabled">选择 P8 文件</a-button>
            </a-upload>
            <div class="field-help">文件必须为 1～16384 bytes；失败后需重新选择。</div>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
    <a-button type="primary" danger :loading="loading" :disabled="disabled" @click="submit">
      {{ privateKey.configured ? '轮换 P8 私钥' : '上传 P8 私钥' }}
    </a-button>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'

const props = defineProps({
  config: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['rotate'])
const formRef = ref()
const selectedFile = ref<any>(null)
const fileList = ref<any[]>([])
const form = reactive({ issuerId: '', keyId: '' })
const privateKey: any = computed(() => props.config.privateKey || {})
const rules = {
  issuerId: [
    { required: true, message: '请输入 Issuer ID', trigger: 'blur' },
    { pattern: /^[0-9a-fA-F-]{36}$/, message: 'Issuer ID 应为 UUID', trigger: 'blur' },
  ],
  keyId: [
    { required: true, message: '请输入 Key ID', trigger: 'blur' },
    { pattern: /^[A-Z0-9]{10}$/, message: 'Key ID 必须为 10 位大写字母或数字', trigger: 'blur' },
  ],
}

function selectFile(file) {
  if (!file || file.size < 1 || file.size > 16 * 1024) {
    message.error('P8 文件必须为 1～16384 bytes')
    clearSecretSelection()
    return false
  }
  selectedFile.value = file
  fileList.value = [file]
  return false
}

function submit() {
  formRef.value.validate().then(() => {
    if (!selectedFile.value) {
      message.error('请选择 P8 文件')
      return
    }
    emit('rotate', {
      file: selectedFile.value,
      issuerId: form.issuerId.trim(),
      keyId: form.keyId.trim().toUpperCase(),
    })
  })
}

function clearSecretSelection() {
  selectedFile.value = null
  fileList.value = []
  form.issuerId = ''
  form.keyId = ''
}

defineExpose({ clearSecretSelection })
</script>

<style lang="less" scoped>
.section-alert,
.key-status {
  margin-bottom: 16px;
}
.field-help {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
