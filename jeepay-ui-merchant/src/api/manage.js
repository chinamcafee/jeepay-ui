/*
 *  全系列 restful api格式, 定义通用req对象
 *
 *  @author terrfly
 *  @site https://www.jeepay.vip
 *  @date 2021/5/8 07:18
 */

import request from '@/http/request'

export const req = {

  // 通用列表查询接口
  list: (url, params) => {
    return request.request({ url: url, method: 'GET', params: params }, true, true, false)
  },

  // 通用新增接口
  add: (url, data) => {
    return request.request({ url: url, method: 'POST', data: data }, true, true, false)
  },

  // 通用查询单条数据接口
  getById: (url, bizId) => {
    return request.request({ url: url + '/' + bizId, method: 'GET' }, true, true, false)
  },

  // 通用修改接口
  updateById: (url, bizId, data) => {
    return request.request({ url: url + '/' + bizId, method: 'PUT', data: data }, true, true, false)
  },

  // 通用删除接口
  delById: (url, bizId) => {
    return request.request({ url: url + '/' + bizId, method: 'DELETE' }, true, true, false)
  }
}

// 全系列 restful api格式 (全局loading方式)
export const reqLoad = {

  // 通用列表查询接口
  list: (url, params) => {
    return request.request({ url: url, method: 'GET', params: params }, true, true, true)
  },

  // 通用新增接口
  add: (url, data) => {
    return request.request({ url: url, method: 'POST', data: data }, true, true, true)
  },

  // 通用查询单条数据接口
  getById: (url, bizId) => {
    return request.request({ url: url + '/' + bizId, method: 'GET' }, true, true, true)
  },

  // 通用修改接口
  updateById: (url, bizId, data) => {
    return request.request({ url: url + '/' + bizId, method: 'PUT', data: data }, true, true, true)
  },

  // 通用删除接口
  delById: (url, bizId) => {
    return request.request({ url: url + '/' + bizId, method: 'DELETE' }, true, true, true)
  }
}

/** 角色管理页面 **/
export const API_URL_ENT_LIST = '/api/sysEnts'
export const API_URL_ROLE_LIST = '/api/sysRoles'
export const API_URL_ROLE_ENT_RELA_LIST = '/api/sysRoleEntRelas'
export const API_URL_SYS_USER_LIST = '/api/sysUsers'
export const API_URL_USER_ROLE_RELA_LIST = '/api/sysUserRoleRelas'
/** 首页统计 **/
export const API_URL_MAIN_STATISTIC = 'api/mainChart'

/** 商户App管理 **/
export const API_URL_MCH_APP = '/api/mchApps'
/** 支付订单管理 **/
export const API_URL_PAY_ORDER_LIST = '/api/payOrder'
/** 退款订单管理 **/
export const API_URL_REFUND_ORDER_LIST = '/api/refundOrder'
/** 支付方式列表 **/
export const API_URL_PAYWAYS_LIST = '/api/payWays'
/** 商户支付参数配置 **/
export const API_URL_MCH_PAYCONFIGS_LIST = '/api/mch/payConfigs'
/** 商户支付通道配置 **/
export const API_URL_MCH_PAYPASSAGE_LIST = '/api/mch/payPassages'
/** 转账订单管理 **/
export const API_URL_TRANSFER_ORDER_LIST = '/api/transferOrders'

/** 分账组管理 **/
export const API_URL_DIVISION_RECEIVER_GROUP = '/api/divisionReceiverGroups'

/** 分账账号管理 **/
export const API_URL_DIVISION_RECEIVER = '/api/divisionReceivers'

/** 分账记录管理 **/
export const API_URL_PAY_ORDER_DIVISION_RECORD_LIST = '/api/division/records'

/** 上传图片/文件地址 **/
export const upload = {
  avatar: request.baseUrl + '/api/ossFiles/avatar',
  cert: request.baseUrl + '/api/ossFiles/cert'
}

const api = {
  user: '/user',
  role_list: '/role',
  service: '/service',
  permission: '/permission',
  permissionNoPager: '/permission/no-pager',
  orgTree: '/org/tree'
}

export default api

/** 获取权限树状结构图 **/
export function getEntTree () {
  return request.request({ url: '/api/sysEnts/showTree', method: 'GET' })
}

/** 更新用户角色信息 */
export function uSysUserRoleRela (sysUserId, roleIdList) {
  return request.request({
    url: 'api/sysUserRoleRelas/relas/' + sysUserId,
    method: 'POST',
    data: { roleIdListStr: JSON.stringify(roleIdList) }
  })
}

export function getRoleList (parameter) {
  return request({
    url: '/api/sysRoles',
    method: 'get',
    params: parameter
  })
}

/** 根据支付接口查询支付参数配置 **/
export function getMchPayConfigUnique (infoId, ifCode) {
  return request.request({
    url: '/api/mch/payConfigs/' + infoId + '/' + ifCode,
    method: 'get'
  })
}

/** 支付体验配置 **/
export function payTest (appId) {
  return request.request({
    url: 'api/paytest/payways/' + appId,
    method: 'GET'
  })
}

/** 支付体验下单配置 **/
export function payTestOrder (parameter) {
  return request.request({
    url: '/api/paytest/payOrders',
    method: 'POST',
    data: parameter
  })
}

/** 根据支付方式查询可用支付接口 **/
export function getAvailablePayInterfaceList (appId, wayCode) {
  return request.request({
    url: '/api/mch/payPassages/availablePayInterface/' + appId + '/' + wayCode,
    method: 'GET'
  })
}

export function getPayAmountWeek () {
  return request.request({
    url: API_URL_MAIN_STATISTIC + '/payAmountWeek',
    method: 'GET'
  })
}

export function getNumCount () {
  return request.request({
    url: API_URL_MAIN_STATISTIC + '/numCount',
    method: 'GET'
  })
}

export function getPayCount (parameter) {
  return request.request({
    url: API_URL_MAIN_STATISTIC + '/payCount',
    method: 'GET',
    params: parameter
  })
}

export function getPayType (parameter) {
  return request.request({
    url: API_URL_MAIN_STATISTIC + '/payTypeCount',
    method: 'GET',
    params: parameter
  })
}

export function getMainUserInfo () {
  return request.request({
    url: API_URL_MAIN_STATISTIC,
    method: 'GET'
  })
}

export function updateUserPass (parameter) {
  return request.request({
    url: '/api/current/modifyPwd',
    method: 'put',
    data: parameter
  })
}

export function updateUserInfo (parameter) {
  return request.request({
    url: '/api/current/user',
    method: 'put',
    data: parameter
  })
}

export function getUserInfo () {
  return request.request({
    url: '/api/current/user',
    method: 'get'
  })
}

/** 获取到webSocket的前缀 （ws://localhost） **/
export function getWebSocketPrefix () {
  // 获取网站域名 +  端口号
  let domain = document.location.protocol + '//' + document.location.host

  // 判断api_base_url 是否设置
  if (process.env.VUE_APP_API_BASE_URL && process.env.VUE_APP_API_BASE_URL !== '/') {
    domain = process.env.VUE_APP_API_BASE_URL
  }

  if (domain.startsWith('https:')) {
    return 'wss://' + domain.replace('https://', '')
  } else {
    return 'ws://' + domain.replace('http://', '')
  }
}

/** 查询支付宝授权地址URL **/
export function queryAlipayIsvsubMchAuthUrl (mchAppId) {
  return request.request({
    url: '/api/mch/payConfigs/alipayIsvsubMchAuthUrls/' + mchAppId,
    method: 'GET'
  })
}

/** 查询商户转账支出的接口 **/
export function queryMchTransferIfCode (appId) {
  return request.request({
    url: 'api/mchTransfers/ifCodes/' + appId,
    method: 'GET'
  })
}

/** 获取渠道用户ID二维码地址 **/
export function getChannelUserQrImgUrl (ifCode, appId, extParam) {
  return request.request({
    url: '/api/mchTransfers/channelUserId',
    method: 'GET',
    params: { ifCode, appId, extParam }
  })
}

/** 转账 **/
export function doTransfer (parameter) {
  return request.request({
    url: '/api/mchTransfers/doTransfer',
    method: 'POST',
    data: parameter
  }, true, true, true)
}

/** 查询当前应用支持的支付接口 **/
export function getIfCodeByAppId (appId) {
  return request.request({
    url: '/api/mch/payConfigs/ifCodes/' + appId,
    method: 'GET'
  }, true, true, true)
}

/** 退款接口 */
export function payOrderRefund (payOrderId, refundAmount, refundReason) {
  return request.request({
    url: '/api/payOrder/refunds/' + payOrderId,
    method: 'POST',
    data: { refundAmount, refundReason }
  })
}

/** 分账重试 */
export function resendDivision (recordId) {
  return request.request({
    url: '/api/division/records/resend/' + recordId,
    method: 'POST'
  })
}

/** Apple IAP 应用配置（Merchant 商户范围由后端登录态注入） **/
const APPLE_IAP_CONFIG_URL = '/api/mch/appleIap/configs'

function appleIapConfigRequest (options) {
  return request.request(options, true, false, false)
}

export function getAppleIapConfig (appId) {
  return appleIapConfigRequest({
    url: APPLE_IAP_CONFIG_URL + '/' + encodeURIComponent(appId),
    method: 'GET'
  })
}

export function saveAppleIapConfig (appId, data) {
  const safeData = Object.assign({}, data)
  delete safeData.mchNo
  return appleIapConfigRequest({
    url: APPLE_IAP_CONFIG_URL + '/' + encodeURIComponent(appId),
    method: 'PUT',
    data: safeData
  })
}

export function deleteAppleIapConfig (appId, rowVersion) {
  return appleIapConfigRequest({
    url: APPLE_IAP_CONFIG_URL + '/' + encodeURIComponent(appId),
    method: 'DELETE',
    params: { rowVersion }
  })
}

export function rotateAppleIapPrivateKey (appId, file, issuerId, keyId, rowVersion) {
  const body = new FormData()
  body.append('p8File', file)
  body.append('issuerId', issuerId)
  body.append('keyId', keyId)
  body.append('rowVersion', String(rowVersion))
  return appleIapConfigRequest({
    url: APPLE_IAP_CONFIG_URL + '/' + encodeURIComponent(appId) + '/keys',
    method: 'POST',
    data: body
  })
}

export function rotateAppleIapNotificationToken (appId, data) {
  const safeData = Object.assign({}, data)
  delete safeData.mchNo
  return appleIapConfigRequest({
    url: APPLE_IAP_CONFIG_URL + '/' + encodeURIComponent(appId) + '/notificationTokens/rotate',
    method: 'POST',
    data: safeData
  })
}

export function confirmAppleIapNotificationUrl (appId, data) {
  const safeData = Object.assign({}, data)
  delete safeData.mchNo
  return appleIapConfigRequest({
    url: APPLE_IAP_CONFIG_URL + '/' + encodeURIComponent(appId) + '/notificationUrls/confirm',
    method: 'POST',
    data: safeData
  })
}

export function validateAppleIapConfig (appId) {
  return appleIapConfigRequest({
    url: APPLE_IAP_CONFIG_URL + '/' + encodeURIComponent(appId) + '/validate',
    method: 'POST'
  })
}

/** Apple IAP 商品映射（Merchant 商户范围由后端登录态注入） **/
const APPLE_IAP_PRODUCT_URL = '/api/mch/appleIap/products'

function merchantAppleProductData (appId, data) {
  const safeData = Object.assign({}, data, { appId })
  delete safeData.mchNo
  return safeData
}

export function listAppleIapProducts (appId, params) {
  const safeParams = merchantAppleProductData(appId, params)
  return request.request({
    url: APPLE_IAP_PRODUCT_URL,
    method: 'GET',
    params: safeParams
  }, true, false, false)
}

export function getAppleIapProduct (appId, productMappingId) {
  return request.request({
    url: APPLE_IAP_PRODUCT_URL + '/' + encodeURIComponent(productMappingId),
    method: 'GET',
    params: { appId }
  }, true, false, false)
}

export function createAppleIapProduct (appId, data) {
  return request.request({
    url: APPLE_IAP_PRODUCT_URL,
    method: 'POST',
    data: merchantAppleProductData(appId, data)
  }, true, false, false)
}

export function updateAppleIapProduct (appId, productMappingId, data) {
  return request.request({
    url: APPLE_IAP_PRODUCT_URL + '/' + encodeURIComponent(productMappingId),
    method: 'PUT',
    data: merchantAppleProductData(appId, data)
  }, true, false, false)
}

export function disableAppleIapProduct (appId, productMappingId, rowVersion) {
  return request.request({
    url: APPLE_IAP_PRODUCT_URL + '/' + encodeURIComponent(productMappingId) + '/disable',
    method: 'POST',
    data: { appId, rowVersion }
  }, true, false, false)
}

export function deleteAppleIapProduct (appId, productMappingId, rowVersion) {
  return request.request({
    url: APPLE_IAP_PRODUCT_URL + '/' + encodeURIComponent(productMappingId),
    method: 'DELETE',
    data: { appId, rowVersion }
  }, true, false, false)
}

export function previewAppleIapProductImport (appId, rows) {
  return request.request({
    url: APPLE_IAP_PRODUCT_URL + '/import/preview',
    method: 'POST',
    data: { appId, rows }
  }, true, false, false)
}

export function commitAppleIapProductImport (appId, rows) {
  return request.request({
    url: APPLE_IAP_PRODUCT_URL + '/import/commit',
    method: 'POST',
    data: { appId, rows }
  }, true, false, false)
}

/** Apple IAP 运营中心（Merchant 商户范围由后端登录态注入） **/
const APPLE_IAP_OPERATIONS_URL = '/api/appleIap'

function merchantAppleOpsParams (appId, params) {
  const safeParams = Object.assign({}, params, { appId })
  delete safeParams.mchNo
  return safeParams
}

export function getAppleIapOverview (appId, environment) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/overview',
    method: 'GET',
    params: merchantAppleOpsParams(appId, { environment })
  }, true, false, false)
}

export function listAppleIapTransactions (appId, params) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/transactions',
    method: 'GET',
    params: merchantAppleOpsParams(appId, params)
  }, true, false, false)
}

export function getAppleIapTransaction (appId, id) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/transactions/' + encodeURIComponent(id),
    method: 'GET',
    params: merchantAppleOpsParams(appId)
  }, true, false, false)
}

export function retryAppleIapTransactionVerification (appId, id, data) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/transactions/' + encodeURIComponent(id) + '/retryVerification',
    method: 'POST',
    params: merchantAppleOpsParams(appId),
    data
  }, true, false, false)
}

export function retryAppleIapTransactionFinish (appId, id, data) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/transactions/' + encodeURIComponent(id) + '/retryFinish',
    method: 'POST',
    params: merchantAppleOpsParams(appId),
    data
  }, true, false, false)
}

export function listAppleIapNotifications (appId, params) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/notifications',
    method: 'GET',
    params: merchantAppleOpsParams(appId, params)
  }, true, false, false)
}

export function getAppleIapNotification (appId, id) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/notifications/' + encodeURIComponent(id),
    method: 'GET',
    params: merchantAppleOpsParams(appId)
  }, true, false, false)
}

export function listAppleIapConsumptionRequests (appId, params) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/consumptionRequests',
    method: 'GET',
    params: merchantAppleOpsParams(appId, params)
  }, true, false, false)
}

export function getAppleIapConsumptionRequest (appId, id) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/consumptionRequests/' + encodeURIComponent(id),
    method: 'GET',
    params: merchantAppleOpsParams(appId)
  }, true, false, false)
}

export function listAppleIapJobs (appId, params) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/jobs',
    method: 'GET',
    params: merchantAppleOpsParams(appId, params)
  }, true, false, false)
}

export function retryAppleIapJob (appId, id, data) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/jobs/' + encodeURIComponent(id) + '/retry',
    method: 'POST',
    params: merchantAppleOpsParams(appId),
    data
  }, true, false, false)
}

export function listAppleIapReconcileRuns (appId, params) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/reconcileRuns',
    method: 'GET',
    params: merchantAppleOpsParams(appId, params)
  }, true, false, false)
}

export function createAppleIapReconcileRun (appId, data) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/reconcileRuns',
    method: 'POST',
    params: merchantAppleOpsParams(appId),
    data
  }, true, false, false)
}

export function rerunAppleIapReconcileRun (appId, id, data) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/reconcileRuns/' + encodeURIComponent(id) + '/rerun',
    method: 'POST',
    params: merchantAppleOpsParams(appId),
    data
  }, true, false, false)
}

export function downloadAppleIapSensitivePayload (appId, data) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/payloads/access',
    method: 'POST',
    params: merchantAppleOpsParams(appId),
    data,
    responseType: 'blob'
  }, false, false, false)
}
