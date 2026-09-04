import {
  createAppleIapReconcileRun,
  downloadAppleIapSensitivePayload,
  getAppleIapConsumptionRequest,
  getAppleIapNotification,
  listAppleIapConsumptionRequests,
  listAppleIapJobs,
  listAppleIapNotifications,
  listAppleIapReconcileRuns,
  rerunAppleIapReconcileRun,
  retryAppleIapJob,
} from '@/api/manage'

export const appleIapOps = {
  notifications: (scope, params) => listAppleIapNotifications(scope.mchNo, scope.appId, params),
  notification: (scope, id) => getAppleIapNotification(scope.mchNo, scope.appId, id),
  consumptions: (scope, params) =>
    listAppleIapConsumptionRequests(scope.mchNo, scope.appId, params),
  consumption: (scope, id) => getAppleIapConsumptionRequest(scope.mchNo, scope.appId, id),
  jobs: (scope, params) => listAppleIapJobs(scope.mchNo, scope.appId, params),
  retryJob: (scope, id, data) => retryAppleIapJob(scope.mchNo, scope.appId, id, data),
  reconcileRuns: (scope, params) => listAppleIapReconcileRuns(scope.mchNo, scope.appId, params),
  createReconcile: (scope, data) => createAppleIapReconcileRun(scope.mchNo, scope.appId, data),
  rerunReconcile: (scope, id, data) =>
    rerunAppleIapReconcileRun(scope.mchNo, scope.appId, id, data),
  downloadPayload: (scope, data) =>
    downloadAppleIapSensitivePayload(scope.mchNo, scope.appId, data),
}
