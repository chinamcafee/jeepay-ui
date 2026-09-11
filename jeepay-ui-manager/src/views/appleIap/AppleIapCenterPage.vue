<template>
  <div class="apple-center apple-iap-ui">
    <div class="iap-page-heading">
      <div>
        <a-button v-if="scopeReady" type="link" class="iap-back" @click="backToApps">
          ← 返回应用列表
        </a-button>
        <h2>{{ scopeReady ? vdata.appName || '应用 IAP 详情' : 'Apple IAP 中心' }}</h2>
        <p v-if="scopeReady">
          商户 {{ vdata.mchNo }}
          <span class="iap-divider">/</span>
          应用 {{ vdata.appId }}
        </p>
        <p v-else>选择商户应用，管理商品、交易与通知。</p>
      </div>
      <a-button
        v-if="scopeReady && canConfig"
        @click="configRef.show(vdata.appId, {}, vdata.mchNo)"
      >
        支付配置与门禁
      </a-button>
      <a-button v-else-if="!scopeReady" :loading="vdata.loading" @click="loadApps">
        刷新列表
      </a-button>
    </div>
    <a-card v-if="!scopeReady" :bordered="false" class="scope-card iap-workspace">
      <a-form layout="inline">
        <a-form-item label="商户号">
          <a-input
            v-model:value="vdata.draftMchNo"
            :maxlength="64"
            allow-clear
            placeholder="输入完整商户号"
            @press-enter="search"
          />
        </a-form-item>
        <a-form-item label="应用 App ID">
          <a-input
            v-model:value="vdata.draftAppId"
            :maxlength="64"
            allow-clear
            placeholder="输入完整 Jeepay App ID"
            @press-enter="search"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" :loading="vdata.loading" @click="search">查询</a-button>
            <a-button @click="resetSearch">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
      <a-alert
        v-if="vdata.scopeError"
        type="error"
        show-icon
        :message="vdata.scopeError"
        class="scope-error"
      />
      <a-table
        :columns="appColumns"
        :data-source="vdata.apps"
        :loading="vdata.loading"
        :pagination="vdata.pagination"
        :row-key="appRowKey"
        :scroll="{ x: 850 }"
        @change="changePage"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'appName'">
            <strong>{{ record.appName || '未命名应用' }}</strong>
          </template>
          <template v-else-if="column.key === 'state'">
            <a-tag :color="record.state === 1 ? 'green' : 'default'">
              {{ record.state === 1 ? '正常' : '停用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'op'">
            <a-button type="link" @click="selectScope(record)">进入 IAP 中心 →</a-button>
          </template>
        </template>
        <template #emptyText>
          <a-empty
            :description="vdata.scopeError ? '列表加载失败，请重试' : '没有匹配的商户应用'"
          />
        </template>
      </a-table>
    </a-card>

    <a-card v-if="scopeReady" :bordered="false" class="iap-workspace iap-detail">
      <a-tabs v-model:activeKey="vdata.activeTab" @change="syncTab">
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
    <AppleIapPayConfig v-if="canConfig" ref="configRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { req } from '@/api/manage'
import { safeAppleError } from './appleIapUiUtils'
import AppleIapPayConfig from '../mchApp/custom/AppleIapPayConfig.vue'
import './appleIap.less'
import AppleIapOverview from './components/AppleIapOverview.vue'
import AppleIapJobList from './components/AppleIapJobList.vue'
import AppleIapNotificationList from './components/AppleIapNotificationList.vue'
import AppleIapProductList from './components/AppleIapProductList.vue'
import AppleIapReconcileRuns from './components/AppleIapReconcileRuns.vue'
import AppleIapTransactionList from './components/AppleIapTransactionList.vue'

const route = useRoute()
const router = useRouter()
const configRef = ref()
const { $access } = getCurrentInstance()!.appContext.config.globalProperties
const canConfig = $access('ENT_APPLE_IAP_CONFIG_VIEW')
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
const tabs = {
  overview: canOverview,
  products: canProducts,
  transactions: canTransactions,
  notices: canNotices,
  jobs: canJobs,
  reconcile: canReconcile,
}
const scopePattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const vdata: any = reactive({
  draftMchNo: '',
  draftAppId: '',
  mchNo: '',
  appId: '',
  scopeError: '',
  activeTab: firstAccessibleTab,
  appName: '',
  apps: [],
  loading: false,
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 个应用`,
  },
})
const scopeReady = computed(() => !!vdata.mchNo && !!vdata.appId)
const scopeKey = computed(() => `${vdata.mchNo}:${vdata.appId}`)

const appColumns = [
  { title: '应用名称', dataIndex: 'appName', key: 'appName', width: 200 },
  { title: '商户号', dataIndex: 'mchNo', width: 200 },
  { title: '应用 App ID', dataIndex: 'appId', width: 300 },
  { title: '应用状态', key: 'state', width: 100 },
  { title: '操作', key: 'op', width: 180, fixed: 'right' },
]
let loadSequence = 0
let filters = { mchNo: '', appId: '' }
watch(
  () => [route.query.mchNo, route.query.appId, route.query.tab],
  () => {
    const mchNo = String(route.query.mchNo || '')
    const appId = String(route.query.appId || '')
    if (scopePattern.test(mchNo) && scopePattern.test(appId)) {
      vdata.mchNo = mchNo
      vdata.appId = appId
      vdata.appName =
        vdata.apps.find((app) => app.mchNo === mchNo && app.appId === appId)?.appName || ''
      vdata.activeTab = tabs[String(route.query.tab)] ? String(route.query.tab) : firstAccessibleTab
    } else {
      vdata.mchNo = ''
      vdata.appId = ''
      loadApps()
    }
  },
  { immediate: true }
)
async function loadApps() {
  const sequence = ++loadSequence
  vdata.loading = true
  vdata.scopeError = ''
  try {
    const result = await req.list('/api/appleIap/apps', {
      ...filters,
      pageNumber: vdata.pagination.current,
      pageSize: vdata.pagination.pageSize,
    })
    if (sequence !== loadSequence) return
    vdata.apps = result.records || []
    vdata.pagination.total = Number(result.total || 0)
  } catch (error) {
    if (sequence !== loadSequence) return
    vdata.apps = []
    vdata.pagination.total = 0
    vdata.scopeError = '应用列表加载失败：' + safeAppleError(error)
  } finally {
    if (sequence === loadSequence) vdata.loading = false
  }
}
function search() {
  filters = { mchNo: vdata.draftMchNo.trim(), appId: vdata.draftAppId.trim() }
  vdata.pagination.current = 1
  loadApps()
}
function resetSearch() {
  vdata.draftMchNo = ''
  vdata.draftAppId = ''
  search()
}
function changePage(page) {
  vdata.pagination.current = page.current
  vdata.pagination.pageSize = page.pageSize
  loadApps()
}
function appRowKey(app) {
  return `${app.mchNo}:${app.appId}`
}
function selectScope(app) {
  router.push({
    path: route.path,
    query: { mchNo: app.mchNo, appId: app.appId, tab: firstAccessibleTab },
  })
}
function backToApps() {
  router.push({ path: route.path, query: {} })
}
function syncTab(tab) {
  router.replace({ path: route.path, query: { ...route.query, tab } })
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
