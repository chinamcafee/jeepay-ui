<template>
  <div class="system-config">
    <h2>应用配置</h2>
    <a-alert v-if="loadFailed" type="error" show-icon message="配置加载失败，请重新加载后再编辑。">
      <template #action><a-button size="small" @click="detail">重新加载</a-button></template>
    </a-alert>
    <a-spin :spinning="vdata.loading">
      <a-form layout="vertical" :disabled="readOnly || vdata.btnLoading">
        <a-row :gutter="[32, 0]">
          <a-col v-for="item in ordinary" :key="item.configKey" :xs="24" :lg="12">
            <ConfigField :item="item" :disabled="editingDisabled" />
          </a-col>
        </a-row>
        <a-divider orientation="left">Apple App 内购买 · IAP</a-divider>
        <a-alert
          type="info"
          show-icon
          class="config-note"
          message="沙盒与生产分别设置，两种环境都需要公网 HTTPS。"
          description="通知基础地址不含令牌；保存后到应用的 Server Notifications V2 生成对应环境 URL，再填写到 App Store Connect。修改地址或渠道开关会撤销旧门禁，需要重新检查并审核。"
        />
        <a-row :gutter="[32, 0]">
          <a-col v-for="item in switches" :key="item.configKey" :xs="24" :md="8">
            <ConfigField :item="item" :disabled="editingDisabled" />
          </a-col>
        </a-row>
        <a-row :gutter="[32, 0]">
          <a-col v-for="environment in environments" :key="environment.key" :xs="24" :lg="12">
            <section class="environment-section">
              <h3>{{ environment.label }}</h3>
              <ConfigField
                v-for="item in environment.items"
                :key="item.configKey"
                :item="item"
                :disabled="editingDisabled"
              />
            </section>
          </a-col>
        </a-row>
        <ConfigField
          v-for="item in internal"
          :key="item.configKey"
          :item="item"
          :disabled="editingDisabled"
        />
        <a-collapse class="config-note">
          <a-collapse-panel key="advanced" header="IAP 进阶参数：限流、重试、调度与运维阈值">
            <p>保存后新请求和下一轮任务读取新值；已领取任务的次数、截止时间等记录保持原有语义。</p>
            <a-row :gutter="[32, 0]">
              <a-col v-for="item in advanced" :key="item.configKey" :xs="24" :lg="12">
                <ConfigField :item="item" :disabled="editingDisabled" />
              </a-col>
            </a-row>
          </a-collapse-panel>
        </a-collapse>
        <p class="config-footnote">
          P8、Issuer ID、Key ID 和安全密钥仍在应用的 IAP 配置中维护。密钥存储连接及 Xcode
          本地测试隔离属于部署设置。
        </p>
        <a-alert
          v-if="saveError"
          type="error"
          show-icon
          message="配置未保存"
          :description="saveError"
        />
        <div class="save-actions">
          <a-button
            v-if="!readOnly"
            type="primary"
            :disabled="vdata.loading || loadFailed || !vdata.configData.length"
            :loading="vdata.btnLoading"
            @click="confirm"
          >
            保存全部配置
          </a-button>
        </div>
      </a-form>
    </a-spin>
  </div>
</template>
<script setup lang="ts">
import { API_URL_SYS_CONFIG, req, getConfigs } from '@/api/manage'
import { reactive, ref, computed, getCurrentInstance } from 'vue'
import ConfigField from './ConfigField.vue'
const { $infoBox, $access } = getCurrentInstance()!.appContext.config.globalProperties
const vdata = reactive({ btnLoading: false, loading: false, configData: [] as any[] })
const loadFailed = ref(false)
const saveError = ref('')
const readOnly = computed(() => !$access('ENT_SYS_CONFIG_EDIT'))
const editingDisabled = computed(
  () => readOnly.value || vdata.btnLoading || vdata.loading || loadFailed.value
)
const isIap = (item: any) => item.configKey.startsWith('appleIap')
const ordinary = computed(() => vdata.configData.filter((item) => !isIap(item)))
const switchKeys = ['appleIapEnabled', 'appleIapSandboxEnabled', 'appleIapProductionEnabled']
const switches = computed(() =>
  vdata.configData.filter((item) => switchKeys.includes(item.configKey))
)
const environmentKeys = (env: string) =>
  ['ConfirmPublicUrl', 'NotificationPublicBaseUrl', 'GatewayOrigin'].map(
    (suffix) => `appleIap${env}${suffix}`
  )
const environments = computed(() =>
  ['Sandbox', 'Production'].map((env) => ({
    key: env,
    label: env === 'Sandbox' ? 'Sandbox · 沙盒' : 'Production · 生产',
    items: vdata.configData.filter((item) => environmentKeys(env).includes(item.configKey)),
  }))
)
const internal = computed(() =>
  vdata.configData.filter((item) => item.configKey === 'appleIapInternalConfirmUrl')
)
const basicKeys = [
  ...switchKeys,
  ...environmentKeys('Sandbox'),
  ...environmentKeys('Production'),
  'appleIapInternalConfirmUrl',
]
const advanced = computed(() =>
  vdata.configData.filter((item) => isIap(item) && !basicKeys.includes(item.configKey))
)
async function detail() {
  vdata.loading = true
  loadFailed.value = false
  saveError.value = ''
  try {
    vdata.configData = await getConfigs('applicationConfig')
    if (!vdata.configData.some((item) => item.configKey === 'appleIapEnabled'))
      throw new Error('IAP migration missing')
  } catch {
    loadFailed.value = true
  } finally {
    vdata.loading = false
  }
}
function confirm() {
  if (editingDisabled.value) return
  $infoBox.confirmPrimary(
    '确认保存全部应用配置和 IAP 配置吗？',
    '修改关键地址或渠道开关后，请重新执行应用门禁与审核。',
    async () => {
      vdata.btnLoading = true
      saveError.value = ''
      const formData = new FormData()
      for (const item of vdata.configData) formData.append(item.configKey, item.configVal)
      try {
        await req.updateById(API_URL_SYS_CONFIG, 'applicationConfig', formData)
        $infoBox.message.success('全部配置已保存，后端自动读取新值')
        await detail()
      } catch (error: any) {
        saveError.value =
          typeof error?.msg === 'string'
            ? error.msg
            : '请求未成功，请检查连接后重试；当前输入已保留。'
      } finally {
        vdata.btnLoading = false
      }
    }
  )
}
detail()
</script>
<style scoped lang="less">
.system-config {
  background: #fff;
  padding: 24px;
}
h2 {
  font-size: 20px;
  margin-bottom: 24px;
}
h3 {
  font-size: 16px;
  margin-bottom: 20px;
}
.config-note {
  margin-bottom: 24px;
}
.environment-section {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 20px;
  margin-bottom: 24px;
}
.config-footnote {
  color: #666;
  line-height: 1.7;
}
.save-actions {
  display: flex;
  justify-content: center;
  padding: 24px 0 8px;
}
@media (max-width: 767px) {
  .system-config {
    padding: 16px;
  }
  .environment-section {
    padding: 16px;
  }
}
</style>
