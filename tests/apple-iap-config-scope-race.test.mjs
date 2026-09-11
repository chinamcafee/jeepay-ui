import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../jeepay-ui-manager/package.json', import.meta.url))
const ts = require('typescript')
const source = readFileSync(new URL('../jeepay-ui-manager/src/views/mchApp/custom/AppleIapPayConfig.vue', import.meta.url), 'utf8')
const show = source.slice(source.indexOf('async function show('), source.indexOf('async function initializeLocalSecurity('))
const load = source.slice(source.indexOf('async function loadConfig('), source.indexOf('function applyConfig('))
const close = source.match(/function onClose\(\) \{[\s\S]*?\n\}/)[0]
const factory = new Function('vdata', 'getAppleIapDeployment', 'getAppleIapConfig', 'showOperationError', ts.transpile(`
  let scopeGeneration = 0, configRequest = 0
  const keyFormRef = { value: null }
  const emptyConfig = () => ({})
  const emptyForm = () => ({})
  const applyConfig = config => { vdata.config = config }
  const isNotFound = error => error.message === 'NOT_FOUND'
  const safeError = error => error.message
  ${show}
  ${load}
  ${close}
  return { show, loadConfig, onClose }
`, { target: ts.ScriptTarget.ES2020 }))
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function harness() {
  const deployments = [], configs = [], errors = [], state = {}
  const api = factory(state, () => {
    const call = deferred(); deployments.push(call); return call.promise
  }, (appId, mchNo) => {
    const call = { ...deferred(), appId, mchNo }; configs.push(call); return call.promise
  }, (...args) => errors.push(args))
  return { ...api, state, deployments, configs, errors }
}
const tick = () => new Promise(resolve => setImmediate(resolve))

// 旧应用部署响应晚到，不能触发对新应用的额外配置请求。
{
  const h = harness()
  const a = h.show('APP_A', {}, 'M_A')
  assert.equal(h.state.loading, true)
  const b = h.show('APP_B', {}, 'M_B')
  h.deployments[0].resolve({ marker: 'A' }); await a
  assert.equal(h.configs.length, 0)
  h.deployments[1].resolve({ marker: 'B' }); await tick()
  assert.deepEqual([h.configs[0].appId, h.configs[0].mchNo], ['APP_B', 'M_B'])
  h.configs[0].resolve({ marker: 'B' }); await b
  assert.equal(h.state.deployment.marker, 'B')
}
// 旧应用配置晚到，不能覆盖当前应用；同应用重复加载也只接纳最新响应。
{
  const h = harness()
  const a = h.show('APP_A', {}, 'M_A')
  h.deployments[0].resolve({}); await tick()
  const b = h.show('APP_B', {}, 'M_B')
  h.deployments[1].resolve({}); await tick()
  h.configs[1].resolve({ marker: 'B' }); await b
  h.configs[0].resolve({ marker: 'A' }); await a
  assert.equal(h.state.config.marker, 'B')
  const old = h.loadConfig(), latest = h.loadConfig()
  h.configs[3].resolve({ marker: 'latest' }); await latest
  h.configs[2].resolve({ marker: 'stale' }); await old
  assert.equal(h.state.config.marker, 'latest')
}
// 关闭后旧请求失败，不弹出错误，也不把已关闭视图改回错误状态。
{
  const h = harness()
  const showing = h.show('APP_A', {}, 'M_A')
  h.onClose()
  h.deployments[0].reject(new Error('stale')); await showing
  assert.deepEqual(h.errors, [])
  const loading = h.show('APP_A', {}, 'M_A')
  h.deployments[1].resolve({}); await tick()
  h.onClose()
  h.configs[0].reject(new Error('stale')); await loading
  assert.equal(h.state.open, false)
  assert.equal(h.state.loading, false)
  assert.equal(h.state.loadError, '')
}
console.log('Apple IAP drawer scope race: PASS (stale deployment, app switch, reload order, close)')
