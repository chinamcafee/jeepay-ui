<template>
  <div>
    <a-alert
      type="warning"
      show-icon
      message="商品映射是支付信任边界：启用目录变化后必须重新执行配置 readiness 和 Manager 审核。"
      class="section"
    />
    <a-card class="section">
      <a-form layout="inline">
        <a-form-item label="关键词">
          <a-input
            v-model:value="vdata.filters.keyword"
            :maxlength="100"
            allow-clear
            placeholder="商户商品 ID / Apple Product ID"
            @press-enter="search"
          />
        </a-form-item>
        <a-form-item label="候选状态">
          <a-select v-model:value="vdata.filters.state" style="width: 130px">
            <a-select-option value="ALL">全部</a-select-option>
            <a-select-option value="ENABLED">启用候选</a-select-option>
            <a-select-option value="DISABLED">已停用</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space wrap>
            <a-button type="primary" @click="search">查询</a-button>
            <a-button @click="reset">重置</a-button>
            <a-button v-if="canSave" type="primary" ghost @click="productFormRef.show()">
              新增映射
            </a-button>
            <a-button v-if="canSave" @click="importDrawerRef.show()">CSV 导入</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
    <a-alert v-if="vdata.error" type="error" show-icon :message="vdata.error" class="section">
      <template #action>
        <a-button size="small" @click="load(vdata.pagination.current)">重试</a-button>
      </template>
    </a-alert>
    <a-table
      :columns="columns"
      :data-source="vdata.records"
      :loading="vdata.loading"
      :pagination="vdata.pagination"
      :scroll="{ x: 1450 }"
      row-key="productMappingId"
      size="small"
      @change="tableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'merchantProductId' || column.key === 'productId'">
          <a-typography-paragraph :copyable="{ text: record[column.key] }" class="identifier">
            {{ record[column.key] }}
          </a-typography-paragraph>
        </template>
        <template v-else-if="column.key === 'amount'">
          {{ record.nominalAmount }} {{ String(record.nominalCurrency || '').toUpperCase() }}
          <div class="minor-unit">货币最小单位</div>
        </template>
        <template v-else-if="column.key === 'state'">
          <a-tag :color="record.state === 'ENABLED' ? 'green' : 'default'">
            {{ record.state === 'ENABLED' ? '启用候选' : '已停用' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'validationState'">
          <a-tag :color="validationColor(record.validationState)">
            {{ validationText(record.validationState) }}
          </a-tag>
          <div v-if="record.lastValidationError" class="validation-error">
            {{ record.lastValidationError }}
          </div>
        </template>
        <template v-else-if="column.key === 'updatedAt'">
          {{ formatAppleTime(record.updatedAt) }}
        </template>
        <template v-else-if="column.key === 'op'">
          <a-space v-if="canSave" wrap>
            <a-button type="link" size="small" @click="productFormRef.show(record)">编辑</a-button>
            <a-button
              v-if="record.state === 'ENABLED'"
              type="link"
              danger
              size="small"
              @click="disable(record)"
            >
              停用
            </a-button>
            <a-button v-else type="link" danger size="small" @click="remove(record)">删除</a-button>
          </a-space>
          <span v-else>只读</span>
        </template>
      </template>
    </a-table>
    <AppleIapProductForm
      ref="productFormRef"
      :mch-no="mchNo"
      :app-id="appId"
      @saved="afterMutation"
    />
    <AppleIapProductImportDrawer
      ref="importDrawerRef"
      :mch-no="mchNo"
      :app-id="appId"
      @imported="afterMutation"
    />
  </div>
</template>

<script setup lang="ts">
import { getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { deleteAppleIapProduct, disableAppleIapProduct, listAppleIapProducts } from '@/api/manage'
import AppleIapProductForm from './AppleIapProductForm.vue'
import AppleIapProductImportDrawer from './AppleIapProductImportDrawer.vue'
import { formatAppleTime, safeAppleError } from '../appleIapUiUtils'

const props = defineProps({
  mchNo: { type: String, required: true },
  appId: { type: String, required: true },
})
const { $infoBox, $access } = getCurrentInstance()!.appContext.config.globalProperties
const canSave = $access('ENT_APPLE_IAP_PRODUCT_SAVE')
const productFormRef = ref()
const importDrawerRef = ref()
const columns = [
  { title: '商户商品 ID', dataIndex: 'merchantProductId', key: 'merchantProductId', width: 220 },
  { title: 'Apple Product ID', dataIndex: 'productId', key: 'productId', width: 280 },
  { title: '类型', dataIndex: 'productType', key: 'productType', width: 130 },
  { title: '名义金额', key: 'amount', width: 170 },
  { title: '最大数量', dataIndex: 'maxQuantity', key: 'maxQuantity', width: 90 },
  { title: '状态', key: 'state', width: 110 },
  { title: 'Apple 校验', key: 'validationState', width: 180 },
  { title: '更新时间', key: 'updatedAt', width: 180 },
  { title: '操作', key: 'op', fixed: 'right', width: 180 },
]
const vdata: any = reactive({
  loading: false,
  error: '',
  records: [],
  filters: { keyword: '', state: 'ALL' },
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
  },
})

onMounted(() => load(1))

async function load(page = 1) {
  vdata.loading = true
  vdata.error = ''
  try {
    const result = await listAppleIapProducts(props.mchNo, props.appId, {
      pageNumber: page,
      pageSize: vdata.pagination.pageSize,
      keyword: vdata.filters.keyword.trim() || undefined,
      state: vdata.filters.state,
    })
    vdata.records = result.records || []
    vdata.pagination.current = Number(result.current || page)
    vdata.pagination.total = Number(result.total || 0)
  } catch (error: any) {
    vdata.records = []
    vdata.pagination.total = 0
    vdata.error = '商品列表加载失败：' + safeAppleError(error)
  } finally {
    vdata.loading = false
  }
}

function search() {
  load(1)
}
function reset() {
  vdata.filters = { keyword: '', state: 'ALL' }
  load(1)
}
function tableChange(pagination) {
  vdata.pagination.pageSize = pagination.pageSize
  load(pagination.current)
}
function afterMutation() {
  load(1)
}

function disable(record) {
  $infoBox.confirmDanger(
    '确认停用商品映射？',
    '现有订单不受影响；应用配置将重置为待验证、待审核。',
    async () => {
      try {
        await disableAppleIapProduct(
          props.mchNo,
          props.appId,
          record.productMappingId,
          record.rowVersion
        )
        $infoBox.message.success('商品映射已停用')
        await load(vdata.pagination.current)
      } catch (error: any) {
        vdata.error = '停用失败：' + safeAppleError(error)
      }
    }
  )
}

function remove(record) {
  $infoBox.confirmDanger(
    '确认删除已停用商品映射？',
    '被订单或交易引用的商品不会被物理删除。',
    async () => {
      try {
        await deleteAppleIapProduct(
          props.mchNo,
          props.appId,
          record.productMappingId,
          record.rowVersion
        )
        $infoBox.message.success('未引用商品映射已删除')
        await load(1)
      } catch (error: any) {
        vdata.error = '删除失败：' + safeAppleError(error)
      }
    }
  )
}

function validationColor(state) {
  return { VALID: 'green', INVALID: 'red', UNCHECKED: 'orange' }[state] || 'default'
}
function validationText(state) {
  return { VALID: '有效', INVALID: '无效', UNCHECKED: '未校验' }[state] || state || '未知'
}
</script>

<style lang="less" scoped>
.section {
  margin-bottom: 16px;
}
.identifier {
  margin-bottom: 0;
  max-width: 260px;
  overflow-wrap: anywhere;
}
.minor-unit {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
.validation-error {
  color: #cf1322;
  max-width: 160px;
  overflow-wrap: anywhere;
  white-space: normal;
}
</style>
