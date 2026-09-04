import request from '@/http/request'

/*
 *  全系列 restful api格式, 定义通用req对象
 *
 *  @author terrfly
 *  @site https://www.jeepay.vip
 *  @date 2021/5/8 07:18
 */
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

/** 服务商、商户管理 **/
export const API_URL_ISV_LIST = '/api/isvInfo'
export const API_URL_MCH_LIST = '/api/mchInfo'
/** 商户App管理 **/
export const API_URL_MCH_APP = '/api/mchApps'
/** 支付订单管理 **/
export const API_URL_PAY_ORDER_LIST = '/api/payOrder'
/** 退款订单管理 **/
export const API_URL_REFUND_ORDER_LIST = '/api/refundOrder'
/** 商户通知管理 **/
export const API_URL_MCH_NOTIFY_LIST = '/api/mchNotify'
/** 系统日志 **/
export const API_URL_SYS_LOG = 'api/sysLog'
/** 系统配置 **/
export const API_URL_SYS_CONFIG = 'api/sysConfigs'
/** 首页统计 **/
export const API_URL_MAIN_STATISTIC = 'api/mainChart'

/** 支付接口定义页面 **/
export const API_URL_IFDEFINES_LIST = '/api/payIfDefines'
export const API_URL_PAYWAYS_LIST = '/api/payWays'
/** 服务商、商户支付参数配置 **/
export const API_URL_ISV_PAYCONFIGS_LIST = '/api/isv/payConfigs'
export const API_URL_MCH_PAYCONFIGS_LIST = '/api/mch/payConfigs'
/** 商户支付通道配置 **/
export const API_URL_MCH_PAYPASSAGE_LIST = '/api/mch/payPassages'
/** 转账订单管理 **/
export const API_URL_TRANSFER_ORDER_LIST = '/api/transferOrders'

/** 上传图片/文件地址 **/
export const upload = {
  avatar: request.baseUrl + '/api/ossFiles/avatar',
  ifBG: request.baseUrl + '/api/ossFiles/ifBG',
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
export function getEntTree (sysType) {
  return request.request({ url: '/api/sysEnts/showTree?sysType=' + sysType, method: 'GET' })
}

/** 退款接口 */
export function payOrderRefund (payOrderId, refundAmount, refundReason) {
  return request.request({
    url: '/api/payOrder/refunds/' + payOrderId,
    method: 'POST',
    data: { refundAmount, refundReason }
  })
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

export function getServiceList (parameter) {
  return request({
    url: api.service,
    method: 'get',
    params: parameter
  })
}

export function getPermissions (parameter) {
  return request({
    url: api.permissionNoPager,
    method: 'get',
    params: parameter
  })
}

export function getOrgTree (parameter) {
  return request({
    url: api.orgTree,
    method: 'get',
    params: parameter
  })
}

// id == 0 add     post
// id != 0 update  put
export function saveService (parameter) {
  return request({
    url: api.service,
    method: parameter.id === 0 ? 'post' : 'put',
    data: parameter
  })
}

export function saveSub (sub) {
  return request({
    url: '/sub',
    method: sub.id === 0 ? 'post' : 'put',
    data: sub
  })
}

export function getIsvPayConfigUnique (infoId, ifCode) {
  return request.request({
    url: '/api/isv/payConfigs/' + infoId + '/' + ifCode,
    method: 'get'
  })
}

export function getMchPayConfigUnique (infoId, ifCode) {
  return request.request({
    url: '/api/mch/payConfigs/' + infoId + '/' + ifCode,
    method: 'get'
  })
}

export function getAvailablePayInterfaceList (mchNo, wayCode) {
  return request.request({
    url: '/api/mch/payPassages/availablePayInterface/' + mchNo + '/' + wayCode,
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

export function getMainUserInfo (parameter) {
  return request.request({
    url: API_URL_MAIN_STATISTIC + '/' + parameter,
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

export function getConfigs (parameter) {
  return request.request({
    url: API_URL_SYS_CONFIG + '/' + parameter,
    method: 'GET'
  })
}

export function getEntBySysType (entId, sysType) {
  return request.request({
    url: '/api/sysEnts/bySysType',
    method: 'GET',
    params: { entId: entId, sysType: sysType }
  })
}

export function mchNotifyResend (notifyId) {
  return request.request({
    url: '/api/mchNotify/resend/' + notifyId,
    method: 'POST'
  })
}

/** 查询支付宝授权地址URL **/
export function queryAlipayIsvsubMchAuthUrl (mchAppId) {
  return request.request({
    url: '/api/mch/payConfigs/alipayIsvsubMchAuthUrls/' + mchAppId,
    method: 'GET'
  })
}

/** Apple IAP 应用配置（Manager 显式指定商户范围） **/
const APPLE_IAP_CONFIG_URL = '/api/appleIap/configs'

function appleIapConfigRequest (options) {
  return request.request(options, true, false, false)
}

export function getAppleIapConfig (appId, mchNo) {
  return appleIapConfigRequest({
    url: APPLE_IAP_CONFIG_URL + '/' + encodeURIComponent(appId),
    method: 'GET',
    params: { mchNo }
  })
}

export function saveAppleIapConfig (appId, mchNo, data) {
  return appleIapConfigRequest({
    url: APPLE_IAP_CONFIG_URL + '/' + encodeURIComponent(appId),
    method: 'PUT',
    data: Object.assign({}, data, { mchNo })
  })
}

export function deleteAppleIapConfig (appId, mchNo, rowVersion) {
  return appleIapConfigRequest({
    url: APPLE_IAP_CONFIG_URL + '/' + encodeURIComponent(appId),
    method: 'DELETE',
    params: { mchNo, rowVersion }
  })
}

export function rotateAppleIapPrivateKey (appId, mchNo, file, issuerId, keyId, rowVersion) {
  const body = new FormData()
  body.append('mchNo', mchNo)
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

export function rotateAppleIapNotificationToken (appId, mchNo, data) {
  return appleIapConfigRequest({
    url: APPLE_IAP_CONFIG_URL + '/' + encodeURIComponent(appId) + '/notificationTokens/rotate',
    method: 'POST',
    data: Object.assign({}, data, { mchNo })
  })
}

export function confirmAppleIapNotificationUrl (appId, mchNo, data) {
  return appleIapConfigRequest({
    url: APPLE_IAP_CONFIG_URL + '/' + encodeURIComponent(appId) + '/notificationUrls/confirm',
    method: 'POST',
    data: Object.assign({}, data, { mchNo })
  })
}

export function validateAppleIapConfig (appId, mchNo) {
  return appleIapConfigRequest({
    url: APPLE_IAP_CONFIG_URL + '/' + encodeURIComponent(appId) + '/validate',
    method: 'POST',
    params: { mchNo }
  })
}

export function decideAppleIapConfigAudit (appId, mchNo, decision, rowVersion) {
  return appleIapConfigRequest({
    url: APPLE_IAP_CONFIG_URL + '/' + encodeURIComponent(appId) + '/auditDecision',
    method: 'POST',
    data: { mchNo, decision, rowVersion }
  })
}

/** Apple IAP 商品映射（Manager 显式指定商户范围） **/
const APPLE_IAP_PRODUCT_URL = '/api/appleIap/products'

export function listAppleIapProducts (mchNo, appId, params) {
  return request.request({
    url: APPLE_IAP_PRODUCT_URL,
    method: 'GET',
    params: Object.assign({}, params, { mchNo, appId })
  }, true, false, false)
}

export function getAppleIapProduct (mchNo, appId, productMappingId) {
  return request.request({
    url: APPLE_IAP_PRODUCT_URL + '/' + encodeURIComponent(productMappingId),
    method: 'GET',
    params: { mchNo, appId }
  }, true, false, false)
}

export function createAppleIapProduct (mchNo, appId, data) {
  return request.request({
    url: APPLE_IAP_PRODUCT_URL,
    method: 'POST',
    data: Object.assign({}, data, { mchNo, appId })
  }, true, false, false)
}

export function updateAppleIapProduct (mchNo, appId, productMappingId, data) {
  return request.request({
    url: APPLE_IAP_PRODUCT_URL + '/' + encodeURIComponent(productMappingId),
    method: 'PUT',
    data: Object.assign({}, data, { mchNo, appId })
  }, true, false, false)
}

export function disableAppleIapProduct (mchNo, appId, productMappingId, rowVersion) {
  return request.request({
    url: APPLE_IAP_PRODUCT_URL + '/' + encodeURIComponent(productMappingId) + '/disable',
    method: 'POST',
    data: { mchNo, appId, rowVersion }
  }, true, false, false)
}

export function deleteAppleIapProduct (mchNo, appId, productMappingId, rowVersion) {
  return request.request({
    url: APPLE_IAP_PRODUCT_URL + '/' + encodeURIComponent(productMappingId),
    method: 'DELETE',
    data: { mchNo, appId, rowVersion }
  }, true, false, false)
}

export function previewAppleIapProductImport (mchNo, appId, rows) {
  return request.request({
    url: APPLE_IAP_PRODUCT_URL + '/import/preview',
    method: 'POST',
    data: { mchNo, appId, rows }
  }, true, false, false)
}

export function commitAppleIapProductImport (mchNo, appId, rows) {
  return request.request({
    url: APPLE_IAP_PRODUCT_URL + '/import/commit',
    method: 'POST',
    data: { mchNo, appId, rows }
  }, true, false, false)
}

/** Apple IAP 运营中心（Manager 数据范围） **/
const APPLE_IAP_OPERATIONS_URL = '/api/appleIap'

function managerAppleOpsParams (mchNo, appId, params) {
  return Object.assign({}, params, { mchNo, appId })
}

export function getAppleIapOverview (mchNo, appId, environment) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/overview',
    method: 'GET',
    params: managerAppleOpsParams(mchNo, appId, { environment })
  }, true, false, false)
}

export function listAppleIapTransactions (mchNo, appId, params) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/transactions',
    method: 'GET',
    params: managerAppleOpsParams(mchNo, appId, params)
  }, true, false, false)
}

export function getAppleIapTransaction (mchNo, appId, id) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/transactions/' + encodeURIComponent(id),
    method: 'GET',
    params: managerAppleOpsParams(mchNo, appId)
  }, true, false, false)
}

export function retryAppleIapTransactionVerification (mchNo, appId, id, data) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/transactions/' + encodeURIComponent(id) + '/retryVerification',
    method: 'POST',
    params: managerAppleOpsParams(mchNo, appId),
    data
  }, true, false, false)
}

export function retryAppleIapTransactionFinish (mchNo, appId, id, data) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/transactions/' + encodeURIComponent(id) + '/retryFinish',
    method: 'POST',
    params: managerAppleOpsParams(mchNo, appId),
    data
  }, true, false, false)
}

export function listAppleIapNotifications (mchNo, appId, params) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/notifications',
    method: 'GET',
    params: managerAppleOpsParams(mchNo, appId, params)
  }, true, false, false)
}

export function getAppleIapNotification (mchNo, appId, id) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/notifications/' + encodeURIComponent(id),
    method: 'GET',
    params: managerAppleOpsParams(mchNo, appId)
  }, true, false, false)
}

export function listAppleIapConsumptionRequests (mchNo, appId, params) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/consumptionRequests',
    method: 'GET',
    params: managerAppleOpsParams(mchNo, appId, params)
  }, true, false, false)
}

export function getAppleIapConsumptionRequest (mchNo, appId, id) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/consumptionRequests/' + encodeURIComponent(id),
    method: 'GET',
    params: managerAppleOpsParams(mchNo, appId)
  }, true, false, false)
}

export function listAppleIapJobs (mchNo, appId, params) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/jobs',
    method: 'GET',
    params: managerAppleOpsParams(mchNo, appId, params)
  }, true, false, false)
}

export function retryAppleIapJob (mchNo, appId, id, data) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/jobs/' + encodeURIComponent(id) + '/retry',
    method: 'POST',
    params: managerAppleOpsParams(mchNo, appId),
    data
  }, true, false, false)
}

export function listAppleIapReconcileRuns (mchNo, appId, params) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/reconcileRuns',
    method: 'GET',
    params: managerAppleOpsParams(mchNo, appId, params)
  }, true, false, false)
}

export function createAppleIapReconcileRun (mchNo, appId, data) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/reconcileRuns',
    method: 'POST',
    params: managerAppleOpsParams(mchNo, appId),
    data
  }, true, false, false)
}

export function rerunAppleIapReconcileRun (mchNo, appId, id, data) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/reconcileRuns/' + encodeURIComponent(id) + '/rerun',
    method: 'POST',
    params: managerAppleOpsParams(mchNo, appId),
    data
  }, true, false, false)
}

export function downloadAppleIapSensitivePayload (mchNo, appId, data) {
  return request.request({
    url: APPLE_IAP_OPERATIONS_URL + '/payloads/access',
    method: 'POST',
    params: managerAppleOpsParams(mchNo, appId),
    data,
    responseType: 'blob'
  }, false, false, false)
}
