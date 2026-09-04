<template>
  <div>
    <a-card class="section">
      <a-space wrap>
        <span>环境</span>
        <a-select v-model:value="vdata.environment" style="width: 160px" @change="load">
          <a-select-option value="ALL">全部环境</a-select-option>
          <a-select-option value="SANDBOX">Sandbox</a-select-option>
          <a-select-option value="PRODUCTION">Production</a-select-option>
        </a-select>
        <a-button :loading="vdata.loading" @click="load">刷新概览</a-button>
      </a-space>
    </a-card>

    <a-alert v-if="vdata.error" type="error" show-icon :message="vdata.error" class="section">
      <template #action><a-button size="small" @click="load">重试</a-button></template>
    </a-alert>
    <a-spin :spinning="vdata.loading">
      <a-empty
        v-if="!vdata.loading && !vdata.views.length"
        description="当前范围暂无 Apple IAP 运营数据"
      />
      <a-card
        v-for="view in vdata.views"
        :key="`${view.appId}:${view.environment}`"
        class="environment-card"
      >
        <template #title>
          <a-space wrap>
            <span>{{ view.environment }}</span>
            <a-tag :color="view.environment === 'PRODUCTION' ? 'blue' : 'orange'">
              {{ view.appId }}
            </a-tag>
          </a-space>
        </template>

        <a-row :gutter="[16, 16]" class="section">
          <a-col v-for="metric in metrics" :key="metric.key" :xs="12" :md="8" :xl="6">
            <a-card size="small" :class="{ danger: metric.danger && Number(view[metric.key]) > 0 }">
              <a-statistic :title="metric.title" :value="Number(view[metric.key] || 0)" />
            </a-card>
          </a-col>
        </a-row>

        <a-alert
          v-if="view.alerts && view.alerts.length"
          type="warning"
          show-icon
          class="section"
          message="当前环境存在需要处理的 SLO 告警"
        >
          <template #description>
            <a-space wrap>
              <a-tag
                v-for="alert in view.alerts"
                :key="alert.code"
                :color="alertColor(alert.severity)"
              >
                {{ alert.code }}：{{ alert.count }}
              </a-tag>
            </a-space>
          </template>
        </a-alert>

        <a-divider orientation="left">累计金额分组（禁止跨币种、跨精度求和）</a-divider>
        <a-table
          :columns="amountColumns"
          :data-source="view.amountGroups || []"
          :pagination="false"
          :row-key="amountRowKey"
          size="small"
          :scroll="{ x: 760 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'kind'">
              <a-tag :color="record.amountKind === 'CHANNEL' ? 'blue' : 'purple'">
                {{ record.amountKind === 'CHANNEL' ? 'Apple 渠道金额' : 'Jeepay 名义金额' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'scale'">
              {{
                record.scale === null || record.scale === undefined ? '最小货币单位' : record.scale
              }}
            </template>
            <template v-else-if="column.key === 'total'">
              <template v-if="record.amountKind === 'CHANNEL'">
                {{ formatScaledAmount(record.totalAmount, record.scale, record.currency) }}
              </template>
              <template v-else>
                {{ record.totalAmount }} {{ String(record.currency || '').toUpperCase() }}
                <span class="minor-unit">（最小货币单位）</span>
              </template>
            </template>
          </template>
          <template #emptyText>当前环境暂无可汇总的已验证交易金额</template>
        </a-table>
      </a-card>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { getAppleIapOverview } from '@/api/manage'
import { formatScaledAmount, safeAppleError } from '../appleIapUiUtils'

const props = defineProps({
  mchNo: { type: String, required: true },
  appId: { type: String, required: true },
})
const metrics = [
  { key: 'transactionCount', title: '交易总数' },
  { key: 'verifiedCount', title: 'Apple 已验证' },
  { key: 'verifiedNotSuccessfulOverThreshold', title: '验证成功但订单未成功', danger: true },
  { key: 'successNotNotifiedOverThreshold', title: '订单成功但未通知', danger: true },
  { key: 'notifiedNotDeliveredOverThreshold', title: '已通知但未发币', danger: true },
  { key: 'deliveredNotFinishedOverThreshold', title: '已发币但未 Finish', danger: true },
  { key: 'revokedNotRefunded', title: '撤销但未退款', danger: true },
  { key: 'unclaimedCount', title: '未认领交易', danger: true },
  { key: 'deadJobCount', title: '死信任务', danger: true },
  { key: 'consumptionDeadlineWarningCount', title: '消费信息临期', danger: true },
  { key: 'appleAuthErrorCount', title: 'Apple 鉴权异常', danger: true },
  { key: 'bindingConflictCount', title: '账户绑定冲突', danger: true },
  { key: 'notificationDelayedCount', title: '通知延迟', danger: true },
]
const amountColumns = [
  { title: '口径', key: 'kind', width: 180 },
  { title: '币种', dataIndex: 'currency', key: 'currency', width: 100 },
  { title: 'Scale', key: 'scale', width: 150 },
  { title: '交易数', dataIndex: 'transactionCount', key: 'transactionCount', width: 100 },
  { title: '合计', key: 'total', width: 220 },
]
const vdata: any = reactive({ loading: false, error: '', environment: 'ALL', views: [] })

onMounted(load)

async function load() {
  vdata.loading = true
  vdata.error = ''
  try {
    const environment = vdata.environment === 'ALL' ? undefined : vdata.environment
    vdata.views = (await getAppleIapOverview(props.mchNo, props.appId, environment)) || []
  } catch (error: any) {
    vdata.views = []
    vdata.error = '运营概览加载失败：' + safeAppleError(error)
  } finally {
    vdata.loading = false
  }
}

function amountRowKey(record) {
  return `${record.amountKind}:${record.currency}:${record.scale === null ? 'minor' : record.scale}`
}
function alertColor(severity) {
  return (
    { P1: 'red', P2: 'orange', CRITICAL: 'red', ERROR: 'red', WARNING: 'orange', INFO: 'blue' }[
      severity
    ] || 'default'
  )
}
</script>

<style lang="less" scoped>
.section {
  margin-bottom: 16px;
}
.environment-card {
  margin-bottom: 16px;
}
.danger {
  border-color: #ff7875;
  background: #fff2f0;
}
.minor-unit {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
