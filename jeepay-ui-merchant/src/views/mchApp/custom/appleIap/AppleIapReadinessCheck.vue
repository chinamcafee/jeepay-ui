<template>
  <div>
    <a-alert
      :type="summaryType"
      show-icon
      :message="summaryText"
      description="PENDING 不等于通过；外部和人工门禁只有取得真实证据后才会变绿。"
      class="summary"
    />
    <a-button
      type="primary"
      :loading="loading"
      :disabled="disabled"
      class="validate"
      @click="$emit('validate')"
    >
      重新执行逐项检查
    </a-button>
    <a-table
      v-if="checks.length"
      :columns="columns"
      :data-source="checks"
      :pagination="false"
      row-key="rowKey"
      size="small"
      :scroll="{ x: 760 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'state'">
          <a-tag :color="stateColor(record.state)">{{ stateText(record.state) }}</a-tag>
        </template>
        <template v-else-if="column.key === 'scope'">
          {{ record.environment || '应用级' }}
          <a-tag v-if="record.externalGate" color="blue">外部门禁</a-tag>
        </template>
        <template v-else-if="column.key === 'message'">
          <span class="message">{{ record.message }}</span>
        </template>
      </template>
    </a-table>
    <a-empty v-else description="尚未执行本次 readiness 检查" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  config: { type: Object, default: () => ({}) },
  report: { type: Object, default: null },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})
defineEmits(['validate'])
const columns = [
  { title: '检查项', dataIndex: 'code', key: 'code', width: 220 },
  { title: '范围', key: 'scope', width: 170 },
  { title: '状态', key: 'state', width: 100 },
  { title: '证据', key: 'message' },
]
const checks: any = computed(() => (props.report && props.report.checks) || [])
const summaryType: any = computed(() => {
  if (props.report) return props.report.ready ? 'success' : 'warning'
  return props.config.readinessState === 'ERROR' ? 'error' : 'info'
})
const summaryText = computed(() => {
  if (props.report)
    return props.report.ready
      ? '全部门禁通过，可以进入启用步骤'
      : '仍有未通过门禁，支付路由保持停用'
  return '当前持久化状态：' + (props.config.readinessState || '未配置')
})
function rowKey(record) {
  return record.code + ':' + (record.environment || 'APP')
}
function stateColor(state) {
  return { PASS: 'green', FAIL: 'red', PENDING: 'orange', SKIPPED: 'default' }[state] || 'default'
}
function stateText(state) {
  return { PASS: '通过', FAIL: '失败', PENDING: '待处理', SKIPPED: '已跳过' }[state] || state
}
</script>

<style lang="less" scoped>
.summary,
.validate {
  margin-bottom: 16px;
}
.message {
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
