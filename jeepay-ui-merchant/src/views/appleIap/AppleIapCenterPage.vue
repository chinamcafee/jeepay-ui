<template>
  <div class="apple-center">
    <a-card title="Apple IAP 中心" class="scope-card">
      <a-form layout="inline">
        <a-form-item label="应用" required>
          <a-select
            v-model:value="vdata.draftAppId"
            show-search
            option-filter-prop="label"
            style="min-width: 320px"
            placeholder="选择当前商户的应用"
            :loading="vdata.loadingApps"
          >
            <a-select-option
              v-for="app in vdata.apps"
              :key="app.appId"
              :value="app.appId"
              :label="`${app.appName || '未命名应用'} (${app.appId})`"
            >
              {{ app.appName || '未命名应用' }}（{{ app.appId }}）
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item><a-button type="primary" @click="applyScope">载入应用</a-button></a-form-item>
      </a-form>
      <a-alert
        v-if="vdata.scopeError"
        type="error"
        show-icon
        :message="vdata.scopeError"
        class="scope-error"
      />
      <div v-if="vdata.appId" class="scope-current">
        当前应用：{{ vdata.appId }}。商户范围由 Merchant 登录态在服务端强制注入。
      </div>
    </a-card>

    <a-card v-if="vdata.appId">
      <a-tabs v-model:activeKey="vdata.activeTab">
        <a-tab-pane v-if="canOverview" key="overview" tab="运营概览">
          <AppleIapOverview :key="`overview:${vdata.appId}`" :app-id="vdata.appId" />
        </a-tab-pane>
        <a-tab-pane v-if="canProducts" key="products" tab="商品映射">
          <AppleIapProductList :key="vdata.appId" :app-id="vdata.appId" />
        </a-tab-pane>
        <a-tab-pane v-if="canTransactions" key="transactions" tab="交易中心">
          <AppleIapTransactionList
            :key="`transactions:${vdata.appId}`"
            :app-id="vdata.appId"
            :initial-transaction-id="String(route.query.transactionId || '')"
            :initial-pay-order-id="String(route.query.payOrderId || '')"
          />
        </a-tab-pane>
        <a-tab-pane v-if="canNotices" key="notices" tab="通知与消费">
          <AppleIapNotificationList :key="`notices:${vdata.appId}`" :app-id="vdata.appId" />
        </a-tab-pane>
        <a-tab-pane v-if="canJobs" key="jobs" tab="可靠任务">
          <AppleIapJobList :key="`jobs:${vdata.appId}`" :app-id="vdata.appId" />
        </a-tab-pane>
        <a-tab-pane v-if="canReconcile" key="reconcile" tab="主动对账">
          <AppleIapReconcileRuns :key="`reconcile:${vdata.appId}`" :app-id="vdata.appId" />
        </a-tab-pane>
      </a-tabs>
      <a-empty v-if="!hasAnyTab" description="当前账号没有 Apple IAP 中心菜单权限" />
    </a-card>
    <a-empty v-else description="当前商户没有可选择的应用，或尚未载入应用" />
  </div>
</template>

<script setup lang="ts">
import { getCurrentInstance, onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { API_URL_MCH_APP, req } from '@/api/manage'
import AppleIapOverview from './components/AppleIapOverview.vue'
import AppleIapJobList from './components/AppleIapJobList.vue'
import AppleIapNotificationList from './components/AppleIapNotificationList.vue'
import AppleIapProductList from './components/AppleIapProductList.vue'
import AppleIapReconcileRuns from './components/AppleIapReconcileRuns.vue'
import AppleIapTransactionList from './components/AppleIapTransactionList.vue'
import { safeAppleError } from './appleIapUiUtils'

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
const vdata: any = reactive({
  loadingApps: false,
  apps: [],
  draftAppId: '',
  appId: '',
  scopeError: '',
  activeTab: requestedTab,
})

onMounted(loadApps)

async function loadApps() {
  vdata.loadingApps = true
  vdata.scopeError = ''
  try {
    const result = await req.list(API_URL_MCH_APP, { pageSize: -1 })
    vdata.apps = result.records || []
    const requested = String(route.query.appId || '')
    const selected = vdata.apps.find((app) => app.appId === requested) || vdata.apps[0]
    if (selected) {
      vdata.draftAppId = selected.appId
      applyScope()
    }
  } catch (error: any) {
    vdata.scopeError = '应用列表加载失败：' + safeAppleError(error)
  } finally {
    vdata.loadingApps = false
  }
}

function applyScope() {
  if (!vdata.apps.some((app) => app.appId === vdata.draftAppId)) {
    vdata.scopeError = '请选择当前商户范围内的有效应用。'
    return
  }
  vdata.scopeError = ''
  vdata.appId = vdata.draftAppId
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
