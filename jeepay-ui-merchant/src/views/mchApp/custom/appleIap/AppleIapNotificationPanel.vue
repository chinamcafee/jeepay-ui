<template>
  <div>
    <a-alert
      type="info"
      show-icon
      message="通知 URL 必须由后端生成；复制到 App Store Connect 后再执行人工确认。"
      class="section-alert"
    />
    <a-form layout="inline" class="grace-form">
      <a-form-item label="旧令牌兼容期（分钟）">
        <a-input-number
          v-model:value="gracePeriodMinutes"
          :min="0"
          :max="10080"
          :precision="0"
          :disabled="disabled"
        />
      </a-form-item>
    </a-form>
    <a-row :gutter="16">
      <a-col v-for="environment in environments" :key="environment.code" :xs="24" :xl="12">
        <a-card :title="environment.label" size="small" class="environment-card">
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="应用环境">
              <a-tag :color="environment.enabled ? 'green' : 'default'">
                {{ environment.enabled ? '已启用' : '未启用' }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="通知 URL">
              <span class="break-all">{{ environment.maskedUrl || '尚未生成' }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="App Store Connect">
              <a-tag :color="environment.confirmedAt ? 'green' : 'orange'">
                {{ environment.confirmedAt ? '已人工确认' : '待人工确认' }}
              </a-tag>
            </a-descriptions-item>
          </a-descriptions>
          <a-space wrap>
            <a-button
              danger
              :loading="loading"
              :disabled="disabled || !environment.enabled"
              @click="$emit('rotate', environment.code, gracePeriodMinutes)"
            >
              轮换通知令牌
            </a-button>
            <a-button
              :loading="loading"
              :disabled="disabled || !environment.enabled || !environment.maskedUrl"
              @click="$emit('confirm', environment.code)"
            >
              确认已配置
            </a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>
    <a-alert
      v-if="oneTimeUrl && oneTimeUrl.notificationUrl"
      type="warning"
      show-icon
      class="one-time-url"
    >
      <template #message>新 {{ oneTimeUrl.environment }} 通知 URL 仅本次显示</template>
      <template #description>
        <a-typography-paragraph :copyable="{ text: oneTimeUrl.notificationUrl }" class="break-all">
          {{ oneTimeUrl.notificationUrl }}
        </a-typography-paragraph>
        <a-button size="small" @click="$emit('clear-one-time')">我已复制，立即清除</a-button>
      </template>
    </a-alert>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps({
  config: { type: Object, default: () => ({}) },
  oneTimeUrl: { type: Object, default: null },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})
defineEmits(['rotate', 'confirm', 'clear-one-time'])
const gracePeriodMinutes = ref(10)
const environments = computed(() => [
  {
    code: 'SANDBOX',
    label: 'Sandbox',
    enabled: !!props.config.sandboxEnabled,
    maskedUrl: props.config.sandboxNotificationUrlMasked,
    confirmedAt: props.config.sandboxNotificationConfirmedAt,
  },
  {
    code: 'PRODUCTION',
    label: 'Production',
    enabled: !!props.config.productionEnabled,
    maskedUrl: props.config.productionNotificationUrlMasked,
    confirmedAt: props.config.productionNotificationConfirmedAt,
  },
])
</script>

<style lang="less" scoped>
.section-alert,
.grace-form,
.environment-card,
.one-time-url {
  margin-bottom: 16px;
}
.break-all {
  overflow-wrap: anywhere;
  word-break: break-all;
}
</style>
