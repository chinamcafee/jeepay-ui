import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const requireFromManager = createRequire(join(repositoryRoot, 'jeepay-ui-manager/package.json'))
const { compileScript, compileTemplate, parse } = requireFromManager('@vue/compiler-sfc')
const { transform } = requireFromManager('esbuild')
const applications = [
  { name: 'manager', directory: 'jeepay-ui-manager', apiRoot: '/api/appleIap/products' },
  { name: 'merchant', directory: 'jeepay-ui-merchant', apiRoot: '/api/mch/appleIap/products' },
]
const componentFiles = [
  'src/views/appleIap/AppleIapCenterPage.vue',
  'src/views/appleIap/components/AppleIapProductList.vue',
  'src/views/appleIap/components/AppleIapProductForm.vue',
  'src/views/appleIap/components/AppleIapProductImportDrawer.vue',
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
    const id = `apple-product-${application.name}-${componentFile.replace(/\W/g, '-')}`
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
      /localStorage|sessionStorage|indexedDB|v-html|console\.(log|debug)/,
      `${relativePath} contains forbidden persistence, raw HTML, or debug output`
    )
  }

  const api = source(`${application.directory}/src/api/manage.js`)
  const productApi = api.slice(api.indexOf('/** Apple IAP 商品映射'))
  assertContains(productApi, application.apiRoot, `${application.name} product API root`)
  for (const token of ["method: 'GET'", "method: 'POST'", "method: 'PUT'", "method: 'DELETE'", '/disable', '/import/preview', '/import/commit']) {
    assertContains(productApi, token, `${application.name} product API contract`)
  }

  const list = source(`${application.directory}/src/views/appleIap/components/AppleIapProductList.vue`)
  assertContains(list, ':pagination="vdata.pagination"', `${application.name} server pagination`)
  assertContains(list, 'disableAppleIapProduct', `${application.name} disable action`)
  assertContains(list, 'deleteAppleIapProduct', `${application.name} protected delete action`)
  assertContains(list, 'ENT_APPLE_IAP_PRODUCT_SAVE', `${application.name} product save permission`)

  const form = source(`${application.directory}/src/views/appleIap/components/AppleIapProductForm.vue`)
  assertContains(form, ':disabled="!!vdata.productMappingId"', `${application.name} immutable identifiers`)
  assertContains(form, 'VERSION_CONFLICT', `${application.name} optimistic-lock recovery`)
  assertContains(form, '重新完成 readiness', `${application.name} readiness warning`)

  const importer = source(`${application.directory}/src/views/appleIap/components/AppleIapProductImportDrawer.vue`)
  assertContains(importer, '!vdata.preview.valid', `${application.name} invalid preview commit gate`)
  assertContains(importer, '任意一行失败时整批不写入', `${application.name} all-or-none explanation`)

  const appConfig = source(`${application.directory}/src/config/appConfig.js`)
  assertContains(appConfig, 'AppleIapCenterPage', `${application.name} dynamic component mapping`)
  assertContains(appConfig, "defaultPath: '/apple-iap'", `${application.name} Apple center path`)
}

const managerProductApi = source('jeepay-ui-manager/src/api/manage.js').slice(
  source('jeepay-ui-manager/src/api/manage.js').indexOf('/** Apple IAP 商品映射')
)
assertContains(managerProductApi, '{ mchNo, appId', 'Manager product API explicit tenant scope')

const merchantProductApi = source('jeepay-ui-merchant/src/api/manage.js').slice(
  source('jeepay-ui-merchant/src/api/manage.js').indexOf('/** Apple IAP 商品映射')
)
assertContains(merchantProductApi, 'delete safeData.mchNo', 'Merchant product API tenant stripping')
assert.doesNotMatch(merchantProductApi, /data:\s*\{\s*mchNo/, 'Merchant product API must not send client mchNo')

const utilitySource = source('jeepay-ui-manager/src/views/appleIap/appleIapUiUtils.ts')
const transformed = await transform(utilitySource, { loader: 'ts', format: 'esm', target: 'es2020' })
const utility = await import(`data:text/javascript;base64,${Buffer.from(transformed.code).toString('base64')}`)
const csv = [
  'merchantProductId,productId,productType,nominalAmount,nominalCurrency,maxQuantity,enabled,metadataJson',
  'rtd.100,tech.wenchuan.rtd.100,CONSUMABLE,100,cny,1,true,"{""label"":""100, RTD""}"',
  'rtd.200,tech.wenchuan.rtd.200,,not-a-number,CNY,,maybe,',
].join('\r\n')
const parsedRows = utility.parseAppleProductCsv(csv)
assert.equal(parsedRows.length, 2)
assert.equal(parsedRows[0].metadataJson, '{"label":"100, RTD"}')
assert.equal(parsedRows[0].enabled, true)
assert.equal(parsedRows[1].productType, 'CONSUMABLE')
assert.equal(parsedRows[1].nominalAmount, null)
assert.equal(parsedRows[1].enabled, null)
assert.throws(() => utility.parseAppleProductCsv('wrong,header\na,b'), /表头必须严格/)
assert.throws(() => utility.parseAppleProductCsv(csv.split('\r\n')[0] + '\n"unterminated'), /未闭合/)
const tooManyRows = [csv.split('\r\n')[0], ...Array.from({ length: 501 }, (_, index) => `rtd.${index},apple.${index},CONSUMABLE,1,cny,1,false,`)].join('\n')
assert.throws(() => utility.parseAppleProductCsv(tooManyRows), /最多允许 500/)

console.log('Apple IAP product UI contract: PASS (2 applications, 8 SFCs, CSV edge cases)')
