import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const requireFromManager = createRequire(join(repositoryRoot, 'jeepay-ui-manager/package.json'))
const { compileScript, compileTemplate, parse } = requireFromManager('@vue/compiler-sfc')

const applications = [
  { name: 'manager', directory: 'jeepay-ui-manager', apiRoot: '/api/appleIap/configs' },
  { name: 'merchant', directory: 'jeepay-ui-merchant', apiRoot: '/api/mch/appleIap/configs' },
]
const componentFiles = [
  'src/views/mchApp/custom/AppleIapPayConfig.vue',
  'src/views/mchApp/custom/appleIap/AppleIapIdentityForm.vue',
  'src/views/mchApp/custom/appleIap/AppleIapKeyForm.vue',
  'src/views/mchApp/custom/appleIap/AppleIapNotificationPanel.vue',
  'src/views/mchApp/custom/appleIap/AppleIapReadinessCheck.vue',
]

function source(relativePath) {
  return readFileSync(join(repositoryRoot, relativePath), 'utf8')
}

function assertContains(haystack, needle, message) {
  assert.ok(haystack.includes(needle), message + ': ' + needle)
}

for (const application of applications) {
  for (const componentFile of componentFiles) {
    const relativePath = join(application.directory, componentFile)
    const filename = join(repositoryRoot, relativePath)
    const componentSource = source(relativePath)
    const parsed = parse(componentSource, { filename })
    assert.deepEqual(parsed.errors, [], `${relativePath} SFC parse errors`)

    const id = `apple-iap-${application.name}-${componentFile.replace(/\W/g, '-')}`
    const script = compileScript(parsed.descriptor, { id })
    if (parsed.descriptor.template) {
      const template = compileTemplate({
        id,
        filename,
        source: parsed.descriptor.template.content,
        compilerOptions: { bindingMetadata: script.bindings },
      })
      assert.deepEqual(template.errors, [], `${relativePath} template compile errors`)
    }

    assert.doesNotMatch(
      componentSource,
      /localStorage|sessionStorage|indexedDB|jeepayStorageWrapper/,
      `${relativePath} must not persist Apple secrets in browser storage`
    )
  }

  const api = source(`${application.directory}/src/api/manage.js`)
  const appleApi = api.slice(api.indexOf('/** Apple IAP 应用配置'))
  assertContains(appleApi, application.apiRoot, `${application.name} API root`)
  for (const path of ['/keys', '/notificationTokens/rotate', '/notificationUrls/confirm', '/validate']) {
    assertContains(appleApi, path, `${application.name} config API path`)
  }
  assert.doesNotMatch(appleApi, /content-type|Content-Type/, `${application.name} must let the browser set multipart boundary`)

  const list = source(`${application.directory}/src/views/mchApp/MchPayIfConfigList.vue`)
  assertContains(list, "record.ifCode === 'apple_iap'", `${application.name} Apple card dispatch`)
  assertContains(list, "ENT_APPLE_IAP_CONFIG_VIEW", `${application.name} Apple card permission`)
  assertContains(list, "./custom/AppleIapPayConfig.vue", `${application.name} Apple drawer registration`)

  const drawer = source(`${application.directory}/src/views/mchApp/custom/AppleIapPayConfig.vue`)
  const identityForm = source(
    `${application.directory}/src/views/mchApp/custom/appleIap/AppleIapIdentityForm.vue`
  )
  const notificationPanel = source(
    `${application.directory}/src/views/mchApp/custom/appleIap/AppleIapNotificationPanel.vue`
  )
  for (const token of ['sandboxEnabled', 'productionEnabled']) {
    assertContains(identityForm, token, `${application.name} independent environment toggle`)
    assertContains(drawer, token, `${application.name} environment persistence`)
  }
  assertContains(identityForm, '至少启用一个环境', `${application.name} requires one environment`)
  assertContains(
    identityForm,
    'Production 环境必须填写 App Apple ID',
    `${application.name} production identity gate`
  )
  for (const token of [
    "code: 'SANDBOX'",
    'config.sandboxEnabled',
    'config.sandboxNotificationUrlMasked',
    'config.sandboxNotificationConfirmedAt',
    "code: 'PRODUCTION'",
    'config.productionEnabled',
    'config.productionNotificationUrlMasked',
    'config.productionNotificationConfirmedAt',
  ]) {
    assertContains(notificationPanel, token, `${application.name} isolated environment control`)
  }
  assertContains(
    notificationPanel,
    "$emit('rotate', environment.code, gracePeriodMinutes)",
    `${application.name} environment-scoped token rotation`
  )
  assertContains(
    notificationPanel,
    "$emit('confirm', environment.code)",
    `${application.name} environment-scoped URL confirmation`
  )
  assertContains(drawer, 'VERSION_CONFLICT', `${application.name} optimistic-lock recovery`)
  assertContains(drawer, 'clearSecretSelection()', `${application.name} P8 clearing`)
  assertContains(drawer, 'vdata.oneTimeUrl = null', `${application.name} one-time URL clearing`)
  assertContains(drawer, '[REDACTED_JWS]', `${application.name} JWS error redaction`)
  assertContains(drawer, '[REDACTED_TOKEN]', `${application.name} notification-token error redaction`)
}

const managerApi = source('jeepay-ui-manager/src/api/manage.js').slice(
  source('jeepay-ui-manager/src/api/manage.js').indexOf('/** Apple IAP 应用配置')
)
assertContains(managerApi, "body.append('mchNo', mchNo)", 'Manager multipart tenant scope')
assertContains(managerApi, 'params: { mchNo }', 'Manager query tenant scope')

const merchantApi = source('jeepay-ui-merchant/src/api/manage.js').slice(
  source('jeepay-ui-merchant/src/api/manage.js').indexOf('/** Apple IAP 应用配置')
)
assert.doesNotMatch(merchantApi, /body\.append\(['"]mchNo/, 'Merchant multipart must not accept client tenant scope')
assert.doesNotMatch(merchantApi, /params:\s*\{\s*mchNo/, 'Merchant query must not accept client tenant scope')
assertContains(merchantApi, 'delete safeData.mchNo', 'Merchant JSON tenant-field stripping')

console.log('Apple IAP config UI contract: PASS (2 applications, 10 SFCs)')
