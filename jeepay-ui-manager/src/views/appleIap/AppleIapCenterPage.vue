<template>
  <div class="apple-center">
    <a-card title="Apple IAP 中心" class="scope-card">
      <a-form layout="inline">
        <a-form-item label="商户号" required>
          <a-input v-model:value="vdata.draftMchNo" :maxlength="64" placeholder="Mch No" />
        </a-form-item>
        <a-form-item label="应用 App ID" required>
          <a-input v-model:value="vdata.draftAppId" :maxlength="64" placeholder="App ID" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="applyScope">载入数据范围</a-button>
        </a-form-item>
      </a-form>
      <a-alert
        v-if="vdata.scopeError"
        type="error"
        show-icon
        :message="vdata.scopeError"
        class="scope-error"
      />
      <div v-if="scopeReady" class="scope-current">
        当前范围：商户 {{ vdata.mchNo }} / 应用 {{ vdata.appId }}。所有 Manager
        请求都会显式携带并由服务端复核该范围。
      </div>
    </a-card>

    <a-card v-if="scopeReady">
      <a-tabs v-model:activeKey="vdata.activeTab">
        <a-tab-pane v-if="canOverview" key="overview" tab="运营概览">
          <AppleIapOverview
            :key="`overview:${scopeKey}`"
            :mch-no="vdata.mchNo"
            :app-id="vdata.appId"
          />
        </a-tab-pane>
        <a-tab-pane v-if="canProducts" key="products" tab="商品映射">
          <AppleIapProductList :key="scopeKey" :mch-no="vdata.mchNo" :app-id="vdata.appId" />
        </a-tab-pane>
        <a-tab-pane v-if="canTransactions" key="transactions" tab="交易中心">
          <AppleIapTransactionList
            :key="`transactions:${scopeKey}`"
            :mch-no="vdata.mchNo"
            :app-id="vdata.appId"
            :initial-transaction-id="String(route.query.transactionId || '')"
            :initial-pay-order-id="String(route.query.payOrderId || '')"
          />
        </a-tab-pane>
        <a-tab-pane v-if="canNotices" key="notices" tab="通知与消费">
          <AppleIapNotificationList
            :key="`notices:${scopeKey}`"
            :mch-no="vdata.mchNo"
            :app-id="vdata.appId"
          />
        </a-tab-pane>
        <a-tab-pane v-if="canJobs" key="jobs" tab="可靠任务">
          <AppleIapJobList :key="`jobs:${scopeKey}`" :mch-no="vdata.mchNo" :app-id="vdata.appId" />
        </a-tab-pane>
        <a-tab-pane v-if="canReconcile" key="reconcile" tab="主动对账">
          <AppleIapReconcileRuns
            :key="`reconcile:${scopeKey}`"
            :mch-no="vdata.mchNo"
            :app-id="vdata.appId"
          />
        </a-tab-pane>
      </a-tabs>
      <a-empty v-if="!hasAnyTab" description="当前账号没有 Apple IAP 中心菜单权限" />
    </a-card>
    <a-empty v-else description="请先选择明确的商户与应用数据范围" />
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'
import AppleIapOverview from './components/AppleIapOverview.vue'
import AppleIapJobList from './components/AppleIapJobList.vue'
import AppleIapNotificationList from './components/AppleIapNotificationList.vue'
import AppleIapProductList from './components/AppleIapProductList.vue'
import AppleIapReconcileRuns from './components/AppleIapReconcileRuns.vue'
import AppleIapTransactionList from './components/AppleIapTransactionList.vue'

const route = useRoute()
const { $access } = getCurrentInstance()!.appContext.config.globalProperties
const canOverview = $access('ENT_APPLE_IAP_OVERVIEW')
const canProducts = $access('ENT_APPLE_IAP_PRODUCT_LIST')
const canTransactions = $access('ENT_APPLE_IAP_TX_LIST')
const canNotices = $access('ENT_APPLE_IAP_NOTICE_LIST')
const canJobs = $access('ENT_APPLE_IAP_JOB_LIST')
const canReconcile = $access('ENT_APPLE_IAP_RECONCILE')
const firstAccessibleTab = canOverview
  ? 'overview'
  : canProducts
    ? 'products'
    : canTransactions
      ? 'transactions'
      : canNotices
        ? 'notices'
        : canJobs
          ? 'jobs'
          : canReconcile
            ? 'reconcile'
            : ''
const hasAnyTab = !!firstAccessibleTab
const requestedTab =
  route.query.tab === 'transactions' && canTransactions ? 'transactions' : firstAccessibleTab
const scopePattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const vdata: any = reactive({
  draftMchNo: '',
  draftAppId: '',
  mchNo: '',
  appId: '',
  scopeError: '',
  activeTab: requestedTab,
})
const scopeReady = computed(() => !!vdata.mchNo && !!vdata.appId)
const scopeKey = computed(() => `${vdata.mchNo}:${vdata.appId}`)

onMounted(() => {
  vdata.draftMchNo = String(route.query.mchNo || '')
  vdata.draftAppId = String(route.query.appId || '')
  if (vdata.draftMchNo && vdata.draftAppId) applyScope()
})

function applyScope() {
  const mchNo = vdata.draftMchNo.trim()
  const appId = vdata.draftAppId.trim()
  if (!scopePattern.test(mchNo) || !scopePattern.test(appId)) {
    vdata.scopeError = '商户号和应用 App ID 必须为 1～64 位字母、数字、下划线或连字符。'
    return
  }
  vdata.scopeError = ''
  vdata.mchNo = mchNo
  vdata.appId = appId
  vdata.activeTab = requestedTab
}
</script>

<style lang="less" scoped>
.apple-center {
  padding: 0;
}
.scope-card {
  margin-bottom: 16px;
}
.scope-error {
  margin-top: 16px;
}
.scope-current {
  margin-top: 12px;
  color: rgba(0, 0, 0, 0.65);
  overflow-wrap: anywhere;
}
</style>
