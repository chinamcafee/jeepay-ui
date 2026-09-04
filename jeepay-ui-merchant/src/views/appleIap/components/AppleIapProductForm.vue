<template>
  <a-drawer
    v-model:open="vdata.open"
    :title="vdata.productMappingId ? '编辑 Apple IAP 商品映射' : '新增 Apple IAP 商品映射'"
    width="640px"
    :mask-closable="false"
    @close="close"
  >
    <a-alert
      type="warning"
      show-icon
      message="启用商品或修改已启用商品会立即停用应用配置，并重置 readiness 与审核。"
      class="section"
    />
    <a-alert v-if="vdata.error" type="error" show-icon :message="vdata.error" class="section">
      <template v-if="vdata.conflict" #action>
        <a-button size="small" @click="reloadLatest">载入最新版本</a-button>
      </template>
    </a-alert>
    <a-spin :spinning="vdata.loading">
      <a-form ref="formRef" :model="vdata.form" :rules="rules" layout="vertical">
        <a-form-item label="商户商品 ID" name="merchantProductId">
          <a-input
            v-model:value="vdata.form.merchantProductId"
            :disabled="!!vdata.productMappingId"
            :maxlength="64"
            placeholder="rtd.recharge.100"
          />
          <div class="help">创建后不可修改；必须与 Link-U 档位 merchantProductId 一致。</div>
        </a-form-item>
        <a-form-item label="Apple Product ID" name="productId">
          <a-input
            v-model:value="vdata.form.productId"
            :disabled="!!vdata.productMappingId"
            :maxlength="100"
            placeholder="tech.wenchuan.linku.rtd.100"
          />
          <div class="help">创建后不可修改；必须与 App Store Connect 完全一致。</div>
        </a-form-item>
        <a-row :gutter="16">
          <a-col :xs="24" :md="12">
            <a-form-item label="商品类型" name="productType">
              <a-select v-model:value="vdata.form.productType" disabled>
                <a-select-option value="CONSUMABLE">CONSUMABLE</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="单次最大数量" name="maxQuantity">
              <a-input-number
                v-model:value="vdata.form.maxQuantity"
                :min="1"
                :max="1"
                disabled
                class="full"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="名义金额（货币最小单位）" name="nominalAmount">
              <a-input-number
                v-model:value="vdata.form.nominalAmount"
                :min="1"
                :max="999999999999"
                :precision="0"
                class="full"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="名义币种" name="nominalCurrency">
              <a-input
                v-model:value="vdata.form.nominalCurrency"
                :maxlength="3"
                placeholder="CNY"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="候选状态" name="enabled">
          <a-radio-group v-model:value="vdata.form.enabled">
            <a-radio :value="false">停用</a-radio>
            <a-radio :value="true">启用候选</a-radio>
          </a-radio-group>
          <div class="help">
            启用候选不代表可购买；仍需配置 READY + APPROVED + ENABLED 且 passage 启用。
          </div>
        </a-form-item>
        <a-form-item label="业务元数据 JSON（可选）" name="metadataJson">
          <a-textarea
            v-model:value="vdata.form.metadataJson"
            :rows="5"
            :maxlength="8192"
            placeholder='{"displayAmount":"100 RTD"}'
          />
          <div class="help">
            仅允许 JSON object，最多 8192 UTF-8 bytes；禁止 Secret、Token、JWS 和用户标识。当前
            {{ metadataBytes }} bytes。
          </div>
        </a-form-item>
      </a-form>
    </a-spin>
    <template #footer>
      <a-space>
        <a-button @click="close">取消</a-button>
        <a-button
          type="primary"
          :loading="vdata.saving"
          :disabled="vdata.loading || vdata.conflict"
          @click="submit"
        >
          保存
        </a-button>
      </a-space>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, reactive, ref } from 'vue'
import { createAppleIapProduct, getAppleIapProduct, updateAppleIapProduct } from '@/api/manage'
import { safeAppleError } from '../appleIapUiUtils'

const props = defineProps({ appId: { type: String, required: true } })
const emit = defineEmits(['saved'])
const { $infoBox } = getCurrentInstance()!.appContext.config.globalProperties
const formRef = ref()

function emptyForm() {
  return {
    merchantProductId: '',
    productId: '',
    productType: 'CONSUMABLE',
    nominalAmount: null,
    nominalCurrency: 'CNY',
    maxQuantity: 1,
    enabled: false,
    metadataJson: '',
    rowVersion: null,
  }
}

const vdata: any = reactive({
  open: false,
  loading: false,
  saving: false,
  conflict: false,
  error: '',
  productMappingId: null,
  originalState: null,
  form: emptyForm(),
})
const metadataBytes = computed(() => new TextEncoder().encode(vdata.form.metadataJson || '').length)
const rules = {
  merchantProductId: [
    { required: true, message: '请输入商户商品 ID', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/, message: '格式或长度不正确', trigger: 'blur' },
  ],
  productId: [
    { required: true, message: '请输入 Apple Product ID', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/, message: '格式或长度不正确', trigger: 'blur' },
  ],
  nominalAmount: [
    { required: true, type: 'integer', min: 1, max: 999999999999, message: '请输入有效整数金额' },
  ],
  nominalCurrency: [
    { required: true, message: '请输入币种', trigger: 'blur' },
    { pattern: /^[A-Za-z]{3}$/, message: '币种必须为 3 位 ASCII 字母', trigger: 'blur' },
  ],
  metadataJson: [{ validator: validateMetadata, trigger: 'blur' }],
}

async function show(record: any = null) {
  vdata.open = true
  vdata.error = ''
  vdata.conflict = false
  vdata.productMappingId = record && record.productMappingId
  vdata.originalState = record && record.state
  vdata.form = emptyForm()
  if (vdata.productMappingId) await reloadLatest()
}

async function reloadLatest() {
  vdata.loading = true
  vdata.error = ''
  vdata.conflict = false
  try {
    const record = await getAppleIapProduct(props.appId, vdata.productMappingId)
    applyRecord(record)
  } catch (error: any) {
    vdata.error = '商品读取失败：' + safeAppleError(error)
  } finally {
    vdata.loading = false
  }
}

function applyRecord(record: any) {
  vdata.originalState = record.state
  vdata.form = {
    merchantProductId: record.merchantProductId,
    productId: record.productId,
    productType: record.productType || 'CONSUMABLE',
    nominalAmount: record.nominalAmount,
    nominalCurrency: String(record.nominalCurrency || '').toUpperCase(),
    maxQuantity: record.maxQuantity || 1,
    enabled: record.state === 'ENABLED',
    metadataJson: record.metadataJson || '',
    rowVersion: record.rowVersion,
  }
}

async function submit() {
  try {
    await formRef.value.validate()
  } catch (_) {
    return
  }
  const action = async () => executeSave()
  if (vdata.form.enabled || vdata.originalState === 'ENABLED') {
    $infoBox.confirmDanger(
      '确认保存启用目录变更？',
      '保存后应用支付配置会被强制停用，必须重新完成 readiness 与 Manager 审核。',
      action
    )
  } else {
    await action()
  }
}

async function executeSave() {
  vdata.saving = true
  vdata.error = ''
  const payload = {
    ...vdata.form,
    merchantProductId: vdata.form.merchantProductId.trim(),
    productId: vdata.form.productId.trim(),
    nominalCurrency: vdata.form.nominalCurrency.trim().toLowerCase(),
    metadataJson: vdata.form.metadataJson.trim() || null,
  }
  try {
    if (vdata.productMappingId) {
      await updateAppleIapProduct(props.appId, vdata.productMappingId, payload)
    } else {
      await createAppleIapProduct(props.appId, payload)
    }
    $infoBox.message.success('Apple IAP 商品映射已保存')
    emit('saved')
    close()
  } catch (error: any) {
    const message = safeAppleError(error)
    vdata.conflict = message.toUpperCase().includes('VERSION_CONFLICT')
    vdata.error =
      (vdata.conflict ? '商品已被其他操作员修改；当前表单已保留。' : '保存失败：') +
      (vdata.conflict ? '' : message)
  } finally {
    vdata.saving = false
  }
}

function validateMetadata() {
  const value = String(vdata.form.metadataJson || '').trim()
  if (!value) return Promise.resolve()
  if (new TextEncoder().encode(value).length > 8192)
    return Promise.reject('元数据超过 8192 UTF-8 bytes')
  try {
    const parsed = JSON.parse(value)
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object')
      return Promise.reject('元数据必须是 JSON object')
    if (containsSensitiveKey(parsed)) return Promise.reject('元数据包含禁止的敏感字段')
    return Promise.resolve()
  } catch (error) {
    return Promise.reject('元数据不是有效 JSON')
  }
}

function containsSensitiveKey(value: any): boolean {
  if (!value || typeof value !== 'object') return false
  const forbidden = new Set([
    'secret',
    'password',
    'token',
    'privatekey',
    'p8',
    'authorization',
    'signedpayload',
    'signedtransactioninfo',
    'payerreference',
    'merchantuserref',
    'appaccounttoken',
  ])
  return Object.entries(value).some(
    ([key, nested]) =>
      forbidden.has(key.replace(/[^A-Za-z0-9]/g, '').toLowerCase()) || containsSensitiveKey(nested)
  )
}

function close() {
  vdata.open = false
  vdata.error = ''
  vdata.conflict = false
  vdata.form = emptyForm()
}

defineExpose({ show })
</script>

<style lang="less" scoped>
.section {
  margin-bottom: 16px;
}
.full {
  width: 100%;
}
.help {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  margin-top: 4px;
  overflow-wrap: anywhere;
}
</style>
