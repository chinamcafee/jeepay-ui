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
      :row-key="rowKey"
      size="small"
      :scroll="{ x: 1090 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'code'">
          <strong>{{ guidance[record.code]?.[0] || record.code }}</strong>
          <div class="check-code">{{ record.code }}</div>
        </template>
        <template v-else-if="column.key === 'state'">
          <a-tag :color="stateColor(record.state)">{{ stateText(record.state) }}</a-tag>
        </template>
        <template v-else-if="column.key === 'scope'">
          {{ record.environment || '应用级' }}
          <a-tag v-if="record.externalGate" color="blue">外部门禁</a-tag>
        </template>
        <template v-else-if="column.key === 'message'">
          <span class="message">{{ record.message }}</span>
        </template>
        <template v-else-if="column.key === 'action'">
          <span v-if="record.state === 'PASS' || record.state === 'SKIPPED'" class="check-code">
            无需处理
          </span>
          <span v-else>{{ guidance[record.code]?.[1] || '根据检查证据处理后重新验证' }}</span>
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
  { title: '检查证据', key: 'message', width: 320 },
  { title: '处理方法', key: 'action', width: 280 },
]
const guidance = {
  IDENTITY_FORMAT: ['应用身份', '在基础身份中核对 Bundle ID、App Apple ID，并选择 Sandbox。'],
  SECRET_STORE: [
    '密钥存储服务',
    '检查三个 Jeepay 服务是否使用同一 Secret Store；本机需启用 local-iap。',
  ],
  PRIVATE_KEY: ['Apple P8 私钥', '在 API 私钥页重新上传 P8，核对 Issuer ID 与 Key ID。'],
  ROOT_CERTIFICATES: [
    'Apple 根证书',
    '本机在 API 私钥页点击“初始化缺失依赖”；部署环境通过受控 Secret Store 配置。',
  ],
  PAYLOAD_ENCRYPTION_KEY: ['载荷加密密钥', '本机初始化缺失依赖，自动生成独立 32 字节密钥。'],
  PAYER_HMAC_KEY: [
    '用户映射密钥',
    '本机初始化缺失依赖，自动生成独立随机密钥；已有用户交易后不要随意轮换。',
  ],
  JWT: ['Apple API 签名', '核对 P8、Issuer ID、Key ID 与 Bundle ID。'],
  APP_STORE_API: [
    'Apple API 鉴权',
    '服务端需能访问 Apple API；401/403 核对内购密钥归属和 Bundle ID。',
  ],
  NOTIFICATION_URL_CONFIRMED: [
    '通知地址人工确认',
    '在通知页生成 URL，填到 App Store Connect 对应环境的 V2 地址后，再点击确认已配置。',
  ],
  ACTIVE_PRODUCT: ['商品映射', '进入 Apple IAP 中心的商品映射页，至少保存一个启用候选。'],
  CONFIRM_PUBLIC_URL: [
    'App 公网确认入口',
    '配置 Gateway HTTPS Origin 和 confirm-public-url，frp 转发至 Gateway，并保留登录保护。',
  ],
  INTERNAL_CONFIRM_ENDPOINT: [
    '内部确认入口与运行开关',
    '检查 Payment 9216、总开关和 Sandbox 运行开关；先补齐两个公网 URL 再开启环境开关。',
  ],
  PAY_PASSAGE: [
    '支付通道候选',
    '应用管理 → 支付通道，配置 Apple App 内购买并启用候选；实际支付仍需全部门禁通过。',
  ],
  AUDIT_APPROVAL: ['配置审核', '全部配置完成后，由运营管理员在基础身份页批准，再重新检查。'],
}
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
.check-code {
  margin-top: 4px;
  color: #596380;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.summary,
.validate {
  margin-bottom: 16px;
}
.message {
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
