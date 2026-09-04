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
  notifications: (scope, params) => listAppleIapNotifications(scope.appId, params),
  notification: (scope, id) => getAppleIapNotification(scope.appId, id),
  consumptions: (scope, params) => listAppleIapConsumptionRequests(scope.appId, params),
  consumption: (scope, id) => getAppleIapConsumptionRequest(scope.appId, id),
  jobs: (scope, params) => listAppleIapJobs(scope.appId, params),
  retryJob: (scope, id, data) => retryAppleIapJob(scope.appId, id, data),
  reconcileRuns: (scope, params) => listAppleIapReconcileRuns(scope.appId, params),
  createReconcile: (scope, data) => createAppleIapReconcileRun(scope.appId, data),
  rerunReconcile: (scope, id, data) => rerunAppleIapReconcileRun(scope.appId, id, data),
  downloadPayload: (scope, data) => downloadAppleIapSensitivePayload(scope.appId, data),
}
