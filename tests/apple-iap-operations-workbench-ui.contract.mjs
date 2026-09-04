import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const requireFromManager = createRequire(
  join(repositoryRoot, "jeepay-ui-manager/package.json"),
);
const { compileScript, compileTemplate, parse } =
  requireFromManager("@vue/compiler-sfc");
const applications = [
  { name: "manager", directory: "jeepay-ui-manager" },
  { name: "merchant", directory: "jeepay-ui-merchant" },
];
const components = [
  "src/views/appleIap/AppleIapCenterPage.vue",
  "src/views/appleIap/components/AppleIapNotificationList.vue",
  "src/views/appleIap/components/AppleIapNotificationDetail.vue",
  "src/views/appleIap/components/AppleIapConsumptionDrawer.vue",
  "src/views/appleIap/components/AppleIapJobList.vue",
  "src/views/appleIap/components/AppleIapReconcileRuns.vue",
  "src/views/appleIap/components/AppleIapPayloadAccessModal.vue",
  "src/views/appleIap/components/AppleIapTransactionDetail.vue",
];

function source(relativePath) {
  return readFileSync(join(repositoryRoot, relativePath), "utf8");
}
function assertContains(haystack, needle, message) {
  assert.ok(haystack.includes(needle), message + ": " + needle);
}

for (const application of applications) {
  const root = application.directory;
  for (const component of components) {
    const relativePath = join(root, component);
    const filename = join(repositoryRoot, relativePath);
    const componentSource = source(relativePath);
    const parsed = parse(componentSource, { filename });
    assert.deepEqual(parsed.errors, [], `${relativePath} SFC parse errors`);
    const id = `apple-workbench-${application.name}-${component.replace(/\W/g, "-")}`;
    const script = compileScript(parsed.descriptor, { id });
    if (parsed.descriptor.template) {
      const template = compileTemplate({
        id,
        filename,
        source: parsed.descriptor.template.content,
        compilerOptions: { bindingMetadata: script.bindings },
      });
      assert.deepEqual(
        template.errors,
        [],
        `${relativePath} template compile errors`,
      );
    }
    assert.doesNotMatch(
      componentSource,
      /localStorage|sessionStorage|indexedDB|v-html|console\.(log|debug)/,
      `${relativePath} contains forbidden persistence, raw HTML, or debug output`,
    );
  }

  const center = source(`${root}/src/views/appleIap/AppleIapCenterPage.vue`);
  for (const permission of [
    "ENT_APPLE_IAP_NOTICE_LIST",
    "ENT_APPLE_IAP_JOB_LIST",
    "ENT_APPLE_IAP_RECONCILE",
  ]) {
    assertContains(
      center,
      permission,
      `${application.name} workbench tab permission`,
    );
  }

  const notices = source(
    `${root}/src/views/appleIap/components/AppleIapNotificationList.vue`,
  );
  assertContains(
    notices,
    "notificationUuid",
    `${application.name} notification identity`,
  );
  assertContains(
    notices,
    "responseDeadline",
    `${application.name} consumption deadline`,
  );
  assertContains(
    notices,
    "后台不提供人工改为同意",
    `${application.name} no forced consent`,
  );
  assertContains(
    notices,
    ':pagination="notice.pagination"',
    `${application.name} notification pagination`,
  );
  assertContains(
    notices,
    ':pagination="consumption.pagination"',
    `${application.name} consumption pagination`,
  );

  const notificationDetail = source(
    `${root}/src/views/appleIap/components/AppleIapNotificationDetail.vue`,
  );
  assertContains(
    notificationDetail,
    "payloadSha256",
    `${application.name} payload digest only`,
  );
  assertContains(
    notificationDetail,
    "targetType: 'NOTIFICATION_PAYLOAD'",
    `${application.name} controlled notification payload target`,
  );
  assert.doesNotMatch(
    notificationDetail,
    /vdata\.record\.(signedPayload|payloadCiphertext)/,
    `${application.name} notification detail must not render raw payload`,
  );

  const consumption = source(
    `${root}/src/views/appleIap/components/AppleIapConsumptionDrawer.vue`,
  );
  assertContains(
    consumption,
    "responseDeadline",
    `${application.name} response deadline display`,
  );
  assertContains(
    consumption,
    "consentState",
    `${application.name} consent evidence state`,
  );
  assertContains(
    consumption,
    "targetType: 'CONSUMPTION_EVIDENCE'",
    `${application.name} controlled evidence target`,
  );
  assert.doesNotMatch(
    consumption,
    /vdata\.record\.evidenceCiphertext/,
    `${application.name} consumption drawer must not render encrypted evidence`,
  );

  const jobs = source(
    `${root}/src/views/appleIap/components/AppleIapJobList.vue`,
  );
  assertContains(
    jobs,
    "Number(record.state) === 4",
    `${application.name} DEAD-only job retry`,
  );
  assertContains(
    jobs,
    "运行中不可重试",
    `${application.name} RUNNING retry denial`,
  );
  assertContains(
    jobs,
    "expectedState: 'DEAD'",
    `${application.name} job retry expected state`,
  );
  assert.doesNotMatch(
    jobs,
    /payloadJson|leaseOwner/,
    `${application.name} job secret fields excluded`,
  );

  const reconciles = source(
    `${root}/src/views/appleIap/components/AppleIapReconcileRuns.vue`,
  );
  assertContains(
    reconciles,
    "terminalStates = [2, 3, 4, 5]",
    `${application.name} terminal rerun gate`,
  );
  assertContains(
    reconciles,
    "PENDING/RUNNING 批次不可重跑",
    `${application.name} running rerun denial`,
  );
  assertContains(
    reconciles,
    "? 30 : 180",
    `${application.name} environment lookback window`,
  );
  assertContains(
    reconciles,
    "setInterval",
    `${application.name} live progress polling`,
  );
  assert.equal(
    (reconciles.match(/newAppleIdempotencyKey\(\)/g) || []).length,
    1,
    `${application.name} create idempotency key generated only when opening`,
  );

  const payload = source(
    `${root}/src/views/appleIap/components/AppleIapPayloadAccessModal.vue`,
  );
  assertContains(
    payload,
    "ENT_APPLE_IAP_PAYLOAD_AUDIT",
    `${application.name} payload audit permission`,
  );
  assertContains(
    payload,
    "至少 8 个字符",
    `${application.name} payload audit reason`,
  );
  assertContains(
    payload,
    "releaseApplePayloadDownload",
    `${application.name} download-only handling`,
  );

  const adapter = source(`${root}/src/views/appleIap/appleIapOpsAdapter.ts`);
  for (const method of [
    "notifications",
    "consumptions",
    "jobs",
    "retryJob",
    "reconcileRuns",
    "createReconcile",
    "rerunReconcile",
    "downloadPayload",
  ]) {
    assertContains(
      adapter,
      method,
      `${application.name} operations adapter method`,
    );
  }
}

const managerApi = source("jeepay-ui-manager/src/api/manage.js").slice(
  source("jeepay-ui-manager/src/api/manage.js").indexOf(
    "/** Apple IAP 运营中心",
  ),
);
assertContains(
  managerApi,
  "managerAppleOpsParams(mchNo, appId",
  "Manager explicit scope",
);
const merchantApi = source("jeepay-ui-merchant/src/api/manage.js").slice(
  source("jeepay-ui-merchant/src/api/manage.js").indexOf(
    "/** Apple IAP 运营中心",
  ),
);
assertContains(
  merchantApi,
  "delete safeParams.mchNo",
  "Merchant tenant stripping",
);
assert.doesNotMatch(
  merchantApi,
  /function\s+\w+AppleIap\w*\s*\(mchNo/,
  "Merchant API must not accept mchNo",
);
for (const api of [managerApi, merchantApi]) {
  for (const path of [
    "/notifications",
    "/consumptionRequests",
    "/jobs",
    "/reconcileRuns",
    "/payloads/access",
  ]) {
    assertContains(api, path, "Operations workbench API path");
  }
  assertContains(
    api,
    "responseType: 'blob'",
    "Sensitive payload uses binary response",
  );
  assertContains(
    api,
    "}, false, false, false)",
    "Sensitive payload bypasses JSON-only interceptor",
  );
}

for (const root of ["jeepay-ui-manager", "jeepay-ui-merchant"]) {
  const utility = source(`${root}/src/views/appleIap/appleIapUiUtils.ts`);
  assertContains(
    utility,
    "URL.createObjectURL",
    `${root} creates transient object URL`,
  );
  assertContains(
    utility,
    "URL.revokeObjectURL",
    `${root} revokes transient object URL`,
  );
  assertContains(
    utility,
    "replace(/[^A-Za-z0-9._-]/g, '_')",
    `${root} sanitizes download filename`,
  );
}

console.log(
  "Apple IAP operations workbench UI contract: PASS (2 applications, 16 SFCs)",
);
