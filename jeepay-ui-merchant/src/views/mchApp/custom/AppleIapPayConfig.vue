<template>
  <a-drawer
    v-model:open="vdata.open"
    title="Apple App 内购买"
    width="72%"
    :closable="true"
    :mask-closable="false"
    :body-style="{ paddingBottom: '84px' }"
    @close="onClose"
  >
    <a-spin :spinning="vdata.loading">
      <div class="status-strip">
        <div class="app-id">{{ vdata.appId }}</div>
        <a-space wrap>
          <a-tag :color="stateColor(vdata.config.state)">{{ stateText(vdata.config.state) }}</a-tag>
          <a-tag :color="readinessColor(vdata.config.readinessState)">
            Readiness：{{ vdata.config.readinessState || '未配置' }}
          </a-tag>
          <a-tag :color="auditColor(vdata.config.auditState)">
            审核：{{ vdata.config.auditState || '未配置' }}
          </a-tag>
          <span>版本 {{ vdata.config.rowVersion || 0 }}</span>
        </a-space>
      </div>

      <a-alert
        v-if="vdata.loadError"
        type="error"
        show-icon
        :message="vdata.loadError"
        class="load-error"
      >
        <template #action><a-button size="small" @click="loadConfig">重新加载</a-button></template>
      </a-alert>

      <a-tabs v-model:activeKey="vdata.activeTab">
        <a-tab-pane key="identity" tab="基础身份">
          <AppleIapIdentityForm
            ref="identityFormRef"
            v-model:model="vdata.form"
            :disabled="!canSave || !!vdata.loadError"
            :can-enable="canEnable"
          />
          <a-space v-if="vdata.exists && canSave" wrap>
            <a-button type="primary" :loading="vdata.saving" @click="saveConfig">
              保存非秘密配置
            </a-button>
            <a-button danger :loading="vdata.saving" @click="deleteDraft">删除未引用草稿</a-button>
          </a-space>
          <a-button v-else-if="canSave" type="primary" :loading="vdata.saving" @click="saveConfig">
            创建安全草稿
          </a-button>
          <a-alert
            v-if="vdata.exists && vdata.config.auditState !== 'APPROVED'"
            type="info"
            show-icon
            message="配置需由运营平台审核；商户端不能自行批准。"
            class="audit-note"
          />
        </a-tab-pane>
        <a-tab-pane key="key" tab="API 私钥">
          <a-alert
            v-if="!vdata.exists"
            type="warning"
            show-icon
            message="请先创建基础配置草稿。"
            class="load-error"
          />
          <AppleIapKeyForm
            ref="keyFormRef"
            :config="vdata.config"
            :disabled="!vdata.exists || !canRotate || !!vdata.loadError"
            :loading="vdata.keyLoading"
            @rotate="rotatePrivateKey"
          />
          <a-divider>安全依赖（只读）</a-divider>
          <a-descriptions bordered size="small" :column="1">
            <a-descriptions-item label="Apple 根证书">
              {{ secretText(vdata.config.rootCertificates) }}
            </a-descriptions-item>
            <a-descriptions-item label="载荷加密密钥">
              {{ secretText(vdata.config.payloadEncryptionKey) }}
            </a-descriptions-item>
            <a-descriptions-item label="用户映射 HMAC 密钥">
              {{ secretText(vdata.config.payerHmacKey) }}
            </a-descriptions-item>
          </a-descriptions>
        </a-tab-pane>
        <a-tab-pane key="notifications" tab="Server Notifications V2">
          <a-alert
            v-if="!vdata.exists"
            type="warning"
            show-icon
            message="请先创建基础配置草稿。"
            class="load-error"
          />
          <AppleIapNotificationPanel
            :config="vdata.config"
            :one-time-url="vdata.oneTimeUrl"
            :disabled="!vdata.exists || !canRotate || !!vdata.loadError"
            :loading="vdata.notificationLoading"
            @rotate="rotateNotificationToken"
            @confirm="confirmNotificationUrl"
            @clear-one-time="clearOneTimeUrl"
          />
        </a-tab-pane>
        <a-tab-pane key="readiness" tab="连通性与启用门禁">
          <AppleIapReadinessCheck
            :config="vdata.config"
            :report="vdata.readinessReport"
            :disabled="!vdata.exists || !canSave || !!vdata.loadError"
            :loading="vdata.validationLoading"
            @validate="validateReadiness"
          />
        </a-tab-pane>
      </a-tabs>
    </a-spin>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, reactive, ref } from 'vue'
import {
  confirmAppleIapNotificationUrl,
  deleteAppleIapConfig,
  getAppleIapConfig,
  rotateAppleIapNotificationToken,
  rotateAppleIapPrivateKey,
  saveAppleIapConfig,
  validateAppleIapConfig,
} from '@/api/manage'
import AppleIapIdentityForm from './appleIap/AppleIapIdentityForm.vue'
import AppleIapKeyForm from './appleIap/AppleIapKeyForm.vue'
import AppleIapNotificationPanel from './appleIap/AppleIapNotificationPanel.vue'
import AppleIapReadinessCheck from './appleIap/AppleIapReadinessCheck.vue'

const { $infoBox, $access } = getCurrentInstance()!.appContext.config.globalProperties
const props = defineProps({ callbackFunc: { type: Function, default: () => ({}) } })
const identityFormRef = ref()
const keyFormRef = ref()
const canSave = $access('ENT_APPLE_IAP_CONFIG_SAVE')
const canRotate = $access('ENT_APPLE_IAP_KEY_ROTATE')

function emptyConfig() {
  return {
    state: 'DISABLED',
    readinessState: 'INCOMPLETE',
    auditState: 'PENDING',
    privateKey: {},
    rootCertificates: {},
    payloadEncryptionKey: {},
    payerHmacKey: {},
    rowVersion: 0,
  }
}
function emptyForm() {
  return {
    bundleId: '',
    appAppleId: null,
    sandboxEnabled: true,
    productionEnabled: false,
    apiTimeoutMs: 5000,
    enabled: false,
  }
}
const vdata: any = reactive({
  open: false,
  loading: false,
  saving: false,
  keyLoading: false,
  notificationLoading: false,
  validationLoading: false,
  loadError: '',
  activeTab: 'identity',
  appId: '',
  exists: false,
  config: emptyConfig(),
  form: emptyForm(),
  readinessReport: null,
  oneTimeUrl: null,
})
const canEnable = computed(
  () => vdata.config.readinessState === 'READY' && vdata.config.auditState === 'APPROVED'
)

async function show(appId) {
  onClose()
  vdata.appId = appId
  vdata.exists = false
  vdata.config = emptyConfig()
  vdata.form = emptyForm()
  vdata.activeTab = 'identity'
  vdata.open = true
  await loadConfig()
}

async function loadConfig() {
  if (!vdata.appId) {
    vdata.loadError = '缺少 appId。'
    return
  }
  vdata.loading = true
  vdata.loadError = ''
  try {
    const config = await getAppleIapConfig(vdata.appId)
    applyConfig(config)
    vdata.exists = true
  } catch (error: any) {
    if (isNotFound(error)) {
      vdata.exists = false
      vdata.config = emptyConfig()
      vdata.form = emptyForm()
      vdata.readinessReport = null
    } else {
      vdata.loadError = '配置读取失败：' + safeError(error)
    }
  } finally {
    vdata.loading = false
  }
}

function applyConfig(config) {
  vdata.config = config || emptyConfig()
  vdata.form = {
    bundleId: config.bundleId || '',
    appAppleId: config.appAppleId || null,
    sandboxEnabled: !!config.sandboxEnabled,
    productionEnabled: !!config.productionEnabled,
    apiTimeoutMs: config.apiTimeoutMs || 5000,
    enabled: config.state === 'ENABLED',
  }
}

async function saveConfig() {
  try {
    await identityFormRef.value.validate()
    if (vdata.form.enabled && hasCriticalChange()) {
      $infoBox.message.error('关键配置有变化，请先以停用状态保存并重新完成 readiness 与审核。')
      return
    }
    vdata.saving = true
    const payload: any = Object.assign({}, vdata.form)
    if (vdata.exists) payload.rowVersion = vdata.config.rowVersion
    const result = await saveAppleIapConfig(vdata.appId, payload)
    applyConfig(result)
    vdata.exists = true
    vdata.readinessReport = null
    $infoBox.message.success('Apple IAP 配置已保存')
    props.callbackFunc()
  } catch (error: any) {
    if (error) showOperationError('保存失败', error)
  } finally {
    vdata.saving = false
  }
}

function rotatePrivateKey(payload) {
  $infoBox.confirmDanger(
    '确认上传或轮换 P8 私钥？',
    '操作会立即停用 Apple IAP，并要求重新验证和审核。',
    async () => {
      vdata.keyLoading = true
      try {
        await rotateAppleIapPrivateKey(
          vdata.appId,
          payload.file,
          payload.issuerId,
          payload.keyId,
          vdata.config.rowVersion
        )
        $infoBox.message.success('P8 私钥已安全写入 Secret Store')
        vdata.readinessReport = null
        await loadConfig()
        props.callbackFunc()
      } catch (error: any) {
        showOperationError('私钥上传失败', error)
      } finally {
        keyFormRef.value && keyFormRef.value.clearSecretSelection()
        vdata.keyLoading = false
      }
    },
    () => keyFormRef.value && keyFormRef.value.clearSecretSelection()
  )
}

function rotateNotificationToken(environment, gracePeriodMinutes) {
  $infoBox.confirmDanger(
    '确认轮换 ' + environment + ' 通知令牌？',
    '新完整 URL 只显示一次；旧 URL 仅在设定兼容期内有效。',
    async () => {
      vdata.notificationLoading = true
      clearOneTimeUrl()
      try {
        const result = await rotateAppleIapNotificationToken(vdata.appId, {
          environment,
          gracePeriodMinutes,
          rowVersion: vdata.config.rowVersion,
        })
        vdata.oneTimeUrl = result
        vdata.readinessReport = null
        await loadConfig()
        $infoBox.message.success('通知令牌已轮换，请立即复制新 URL')
        props.callbackFunc()
      } catch (error: any) {
        showOperationError('通知令牌轮换失败', error)
      } finally {
        vdata.notificationLoading = false
      }
    }
  )
}

function confirmNotificationUrl(environment) {
  $infoBox.confirmPrimary(
    '确认 App Store Connect 已配置？',
    '此操作只记录人工证明，不会自动修改 Apple 后台。',
    async () => {
      vdata.notificationLoading = true
      try {
        await confirmAppleIapNotificationUrl(vdata.appId, {
          environment,
          rowVersion: vdata.config.rowVersion,
        })
        await loadConfig()
        $infoBox.message.success('人工确认已记录')
      } catch (error: any) {
        showOperationError('确认失败', error)
      } finally {
        vdata.notificationLoading = false
      }
    }
  )
}

async function validateReadiness() {
  vdata.validationLoading = true
  try {
    vdata.readinessReport = await validateAppleIapConfig(vdata.appId)
    await loadConfig()
    $infoBox.message.success(
      vdata.readinessReport.ready ? '全部门禁通过' : '检查完成，仍有未通过项'
    )
    props.callbackFunc()
  } catch (error: any) {
    showOperationError('Readiness 检查失败', error)
  } finally {
    vdata.validationLoading = false
  }
}

function deleteDraft() {
  $infoBox.confirmDanger(
    '确认删除 Apple IAP 草稿？',
    '仅未引用的停用且未完成草稿允许删除。',
    async () => {
      vdata.saving = true
      try {
        await deleteAppleIapConfig(vdata.appId, vdata.config.rowVersion)
        $infoBox.message.success('Apple IAP 草稿已删除')
        props.callbackFunc()
        onClose()
      } catch (error: any) {
        showOperationError('删除失败', error)
      } finally {
        vdata.saving = false
      }
    }
  )
}

function hasCriticalChange() {
  if (!vdata.exists) return true
  return (
    vdata.form.bundleId !== vdata.config.bundleId ||
    Number(vdata.form.appAppleId || 0) !== Number(vdata.config.appAppleId || 0) ||
    !!vdata.form.sandboxEnabled !== !!vdata.config.sandboxEnabled ||
    !!vdata.form.productionEnabled !== !!vdata.config.productionEnabled ||
    Number(vdata.form.apiTimeoutMs) !== Number(vdata.config.apiTimeoutMs)
  )
}
function showOperationError(prefix, error) {
  const text = safeError(error)
  if (text.toUpperCase().includes('VERSION_CONFLICT')) {
    vdata.loadError = '配置版本已变化。当前表单未被清空，请另行核对后再重新加载。'
  }
  $infoBox.message.error(prefix + '：' + text)
}
function safeError(error) {
  const raw = typeof error === 'string' ? error : error && (error.msg || error.message)
  const message = String(raw || '请求未完成')
  if (/SECRET_PROVIDER_UNAVAILABLE|Apple IAP Secret\/KMS provider is unavailable/i.test(message)) {
    return '服务端密钥存储未配置或不可用，请管理员配置后重新选择 P8 文件上传。'
  }
  if (/SECRET_WRITE_FAILED/i.test(message)) {
    return '服务端无法保存密钥，请管理员检查密钥存储权限与可用性后重试。'
  }
  return message
    .replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, '[REDACTED]')
    .replace(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWS]')
    .replace(/\b[A-Za-z0-9_-]{43}\b/g, '[REDACTED_TOKEN]')
    .slice(0, 300)
}
function isNotFound(error) {
  return safeError(error).toUpperCase().includes('NOT_FOUND')
}
function clearOneTimeUrl() {
  vdata.oneTimeUrl = null
}
function secretText(secret) {
  if (!secret || !secret.configured) return '未配置'
  return (
    '已配置 · 版本 ' +
    (secret.version || '-') +
    (secret.fingerprint ? ' · ' + secret.fingerprint : '')
  )
}
function stateColor(state) {
  return state === 'ENABLED' ? 'green' : 'default'
}
function stateText(state) {
  return state === 'ENABLED' ? '已启用' : vdata.exists ? '已停用' : '未配置'
}
function readinessColor(state) {
  return { READY: 'green', ERROR: 'red', INCOMPLETE: 'orange' }[state] || 'default'
}
function auditColor(state) {
  return { APPROVED: 'green', REJECTED: 'red', PENDING: 'orange' }[state] || 'default'
}
function onClose() {
  keyFormRef.value && keyFormRef.value.clearSecretSelection()
  vdata.oneTimeUrl = null
  vdata.readinessReport = null
  vdata.loadError = ''
  vdata.open = false
}

defineExpose({ show })
</script>

<style lang="less" scoped>
.status-strip {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}
.app-id {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.load-error,
.audit-note {
  margin-bottom: 16px;
}
</style>
