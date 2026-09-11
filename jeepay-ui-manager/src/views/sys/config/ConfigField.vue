<template>
  <a-form-item
    :label="item.configName"
    :html-for="item.configKey"
    :extra="item.configDesc || undefined"
  >
    <a-switch
      :id="item.configKey"
      :aria-label="item.configName"
      v-if="item.type === 'switch'"
      :checked="item.configVal === 'true'"
      :disabled="disabled"
      checked-children="开启"
      un-checked-children="关闭"
      @change="(value) => (item.configVal = String(value))"
    />
    <a-input-number
      :id="item.configKey"
      :aria-label="item.configName"
      v-else-if="item.type === 'number'"
      :value="Number(item.configVal)"
      :disabled="disabled"
      :min="1"
      :precision="0"
      style="width: 100%"
      @change="(value) => (item.configVal = value == null ? '' : String(value))"
    />
    <a-textarea
      :id="item.configKey"
      :aria-label="item.configName"
      v-else-if="item.type === 'textarea'"
      v-model:value="item.configVal"
      :disabled="disabled"
    />
    <a-input
      :id="item.configKey"
      :aria-label="item.configName"
      v-else
      v-model:value="item.configVal"
      :disabled="disabled"
      :maxlength="item.configKey.startsWith('appleIap') ? 512 : undefined"
      autocomplete="off"
    />
  </a-form-item>
</template>
<script setup lang="ts">
defineProps<{ item: any; disabled: boolean }>()
</script>
