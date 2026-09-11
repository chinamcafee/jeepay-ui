<template>
  <a-drawer root-class-name="apple-iap-ui apple-iap-dialog"
    v-model:open="vdata.open"
    title="CSV 导入 Apple IAP 商品映射"
    width="80%"
    :mask-closable="false"
    @close="close"
  >
    <a-alert
      type="info"
      show-icon
      message="浏览器仅解析 CSV 并提交结构化 rows；预览不写库，正式提交必须整批合法。"
      class="section"
    />
    <a-alert
      type="warning"
      show-icon
      message="若导入包含启用候选，应用配置会被停用并重置 readiness 与审核。"
      class="section"
    />
    <div class="header-help">
      表头：merchantProductId,productId,productType,nominalAmount,nominalCurrency,maxQuantity,enabled,metadataJson
    </div>
    <a-space wrap class="section">
      <a-upload
        accept=".csv,text/csv"
        :before-upload="selectFile"
        :file-list="vdata.fileList"
        :max-count="1"
        @remove="resetFile"
      >
        <a-button>选择 CSV</a-button>
      </a-upload>
      <a-button
        type="primary"
        :loading="vdata.previewing"
        :disabled="!vdata.rows.length"
        @click="preview"
      >
        服务端预览
      </a-button>
      <a-button
        danger
        :loading="vdata.committing"
        :disabled="!vdata.preview || !vdata.preview.valid || vdata.preview.committed"
        @click="commit"
      >
        全量提交
      </a-button>
    </a-space>
    <a-alert v-if="vdata.error" type="error" show-icon :message="vdata.error" class="section" />
    <a-descriptions v-if="vdata.preview" bordered size="small" :column="4" class="section">
      <a-descriptions-item label="总行数">{{ vdata.preview.totalCount }}</a-descriptions-item>
      <a-descriptions-item label="合法">{{ validRowCount }}</a-descriptions-item>
      <a-descriptions-item label="失败">{{ vdata.preview.failureCount }}</a-descriptions-item>
      <a-descriptions-item label="状态">
        <a-tag :color="vdata.preview.committed ? 'green' : vdata.preview.valid ? 'blue' : 'red'">
          {{ vdata.preview.committed ? '已提交' : vdata.preview.valid ? '可提交' : '需修正' }}
        </a-tag>
      </a-descriptions-item>
    </a-descriptions>
    <a-table
      v-if="vdata.preview"
      :columns="columns"
      :data-source="vdata.preview.rows || []"
      :pagination="false"
      :scroll="{ x: 900, y: 460 }"
      row-key="lineNumber"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="record.errors && record.errors.length ? 'red' : 'green'">
            {{ record.status }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'errors'">
          <span class="error-text">{{ (record.errors || []).join('；') || '-' }}</span>
        </template>
        <template v-else-if="column.key === 'merchantProductId' || column.key === 'productId'">
          <a-typography-paragraph
            :copyable="record[column.key] ? { text: record[column.key] } : false"
            class="identifier"
          >
            {{ record[column.key] || '-' }}
          </a-typography-paragraph>
        </template>
      </template>
    </a-table>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, reactive } from 'vue'
import { commitAppleIapProductImport, previewAppleIapProductImport } from '@/api/manage'
import { parseAppleProductCsv, safeAppleError } from '../appleIapUiUtils'

const props = defineProps({
  mchNo: { type: String, required: true },
  appId: { type: String, required: true },
})
const emit = defineEmits(['imported'])
const { $infoBox } = getCurrentInstance()!.appContext.config.globalProperties
const columns = [
  { title: 'CSV 行', dataIndex: 'lineNumber', key: 'lineNumber', width: 80 },
  { title: '商户商品 ID', dataIndex: 'merchantProductId', key: 'merchantProductId', width: 220 },
  { title: 'Apple Product ID', dataIndex: 'productId', key: 'productId', width: 260 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
  { title: '错误', key: 'errors' },
]
const vdata: any = reactive({
  open: false,
  previewing: false,
  committing: false,
  error: '',
  fileList: [],
  rows: [],
  preview: null,
})
const validRowCount = computed(
  () => (vdata.preview && vdata.preview.totalCount - vdata.preview.failureCount) || 0
)

function show() {
  resetFile()
  vdata.open = true
}

async function selectFile(file: File) {
  resetFile()
  if (!file || file.size < 1 || file.size > 1024 * 1024) {
    vdata.error = 'CSV 文件必须为 1 byte～1 MiB'
    return false
  }
  try {
    vdata.rows = parseAppleProductCsv(await file.text())
    vdata.fileList = [file]
  } catch (error: any) {
    vdata.error = safeAppleError(error)
  }
  return false
}

async function preview() {
  vdata.previewing = true
  vdata.error = ''
  try {
    vdata.preview = await previewAppleIapProductImport(props.mchNo, props.appId, vdata.rows)
  } catch (error: any) {
    vdata.error = '预览失败：' + safeAppleError(error)
  } finally {
    vdata.previewing = false
  }
}

function commit() {
  $infoBox.confirmDanger(
    '确认整批导入商品映射？',
    '服务端会重新校验；任意一行失败时整批不写入。',
    async () => {
      vdata.committing = true
      vdata.error = ''
      try {
        const result = await commitAppleIapProductImport(props.mchNo, props.appId, vdata.rows)
        vdata.preview = result
        if (!result.committed) {
          vdata.error = '提交时数据状态已变化，整批未写入；请根据逐行错误修正后重新预览。'
          return
        }
        $infoBox.message.success(`已原子导入 ${result.successCount} 条商品映射`)
        emit('imported')
      } catch (error: any) {
        vdata.error = '导入失败：' + safeAppleError(error)
      } finally {
        vdata.committing = false
      }
    }
  )
}

function resetFile() {
  vdata.fileList = []
  vdata.rows = []
  vdata.preview = null
  vdata.error = ''
  return true
}

function close() {
  resetFile()
  vdata.open = false
}

defineExpose({ show })
</script>

<style lang="less" scoped>
.section {
  margin-bottom: 16px;
}
.header-help {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  overflow-wrap: anywhere;
}
.identifier {
  margin-bottom: 0;
  max-width: 240px;
  overflow-wrap: anywhere;
}
.error-text {
  color: #cf1322;
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
