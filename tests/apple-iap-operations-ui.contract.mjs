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
const { transform } = requireFromManager("esbuild");
const applications = [
  { name: "manager", directory: "jeepay-ui-manager" },
  { name: "merchant", directory: "jeepay-ui-merchant" },
];
const componentFiles = [
  "src/views/appleIap/AppleIapCenterPage.vue",
  "src/views/appleIap/components/AppleIapOverview.vue",
  "src/views/appleIap/components/AppleIapTransactionList.vue",
  "src/views/appleIap/components/AppleIapTransactionDetail.vue",
  "src/views/appleIap/components/AppleIapActionModal.vue",
];

function source(relativePath) {
  return readFileSync(join(repositoryRoot, relativePath), "utf8");
}

function assertContains(haystack, needle, message) {
  assert.ok(haystack.includes(needle), message + ": " + needle);
}

for (const application of applications) {
  for (const componentFile of componentFiles) {
    const relativePath = join(application.directory, componentFile);
    const filename = join(repositoryRoot, relativePath);
    const componentSource = source(relativePath);
    const parsed = parse(componentSource, { filename });
    assert.deepEqual(parsed.errors, [], `${relativePath} SFC parse errors`);
    const id = `apple-ops-${application.name}-${componentFile.replace(/\W/g, "-")}`;
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

  const root = application.directory;
  const center = source(`${root}/src/views/appleIap/AppleIapCenterPage.vue`);
  assertContains(
    center,
    "ENT_APPLE_IAP_OVERVIEW",
    `${application.name} overview permission`,
  );
  assertContains(
    center,
    "ENT_APPLE_IAP_TX_LIST",
    `${application.name} transaction permission`,
  );
  assertContains(
    center,
    "firstAccessibleTab",
    `${application.name} accessible tab fallback`,
  );

  const overview = source(
    `${root}/src/views/appleIap/components/AppleIapOverview.vue`,
  );
  assertContains(
    overview,
    "view.amountGroups || []",
    `${application.name} isolated amount groups`,
  );
  assertContains(
    overview,
    "禁止跨币种、跨精度求和",
    `${application.name} amount aggregation warning`,
  );
  assert.doesNotMatch(
    overview,
    /amountGroups[^\n]*\.reduce\(/,
    `${application.name} must not sum amount groups`,
  );

  const list = source(
    `${root}/src/views/appleIap/components/AppleIapTransactionList.vue`,
  );
  for (const filter of [
    "environment",
    "transactionId",
    "payOrderId",
    "mchOrderNo",
    "productId",
    "secondaryState",
    "tertiaryState",
    "revoked",
    "queryDateRange",
  ]) {
    assertContains(list, filter, `${application.name} transaction filter`);
  }
  assertContains(
    list,
    ':pagination="vdata.pagination"',
    `${application.name} server pagination`,
  );
  assertContains(
    list,
    ':copyable="{ text: record.transactionId }"',
    `${application.name} copyable Apple transaction id`,
  );
  assertContains(
    list,
    "accountTokenHint",
    `${application.name} account token suffix only`,
  );

  const detail = source(
    `${root}/src/views/appleIap/components/AppleIapTransactionDetail.vue`,
  );
  assertContains(
    detail,
    "ENT_APPLE_IAP_JOB_RETRY",
    `${application.name} retry permission`,
  );
  assertContains(
    detail,
    "expectedState: 'DEAD'",
    `${application.name} expected-state gate`,
  );
  assertContains(
    detail,
    "[3, 5].includes",
    `${application.name} verification retry state gate`,
  );
  assertContains(
    detail,
    "finishState) === 4",
    `${application.name} finish retry state gate`,
  );
  assertContains(detail, "jwsSha256", `${application.name} JWS digest display`);
  assert.doesNotMatch(
    detail,
    /signedTransactionInfo|signedRenewalInfo|rawJws|appAccountToken(?!Hint)/,
    `${application.name} detail must not expose raw Apple proof or account token`,
  );

  const action = source(
    `${root}/src/views/appleIap/components/AppleIapActionModal.vue`,
  );
  assert.equal(
    (action.match(/newAppleIdempotencyKey\(\)/g) || []).length,
    1,
    `${application.name} idempotency key must be generated only when opening the action`,
  );
  assertContains(
    action,
    "请求失败后保持不变",
    `${application.name} stable retry idempotency explanation`,
  );
  assertContains(
    action,
    "min: 8,",
    `${application.name} required audit reason length`,
  );
}

const managerApi = source("jeepay-ui-manager/src/api/manage.js").slice(
  source("jeepay-ui-manager/src/api/manage.js").indexOf(
    "/** Apple IAP 运营中心",
  ),
);
for (const path of [
  "/overview",
  "/transactions",
  "/retryVerification",
  "/retryFinish",
]) {
  assertContains(managerApi, path, "Manager operations API path");
}
assertContains(
  managerApi,
  "managerAppleOpsParams(mchNo, appId",
  "Manager explicit merchant/app scope",
);

const merchantApi = source("jeepay-ui-merchant/src/api/manage.js").slice(
  source("jeepay-ui-merchant/src/api/manage.js").indexOf(
    "/** Apple IAP 运营中心",
  ),
);
assertContains(
  merchantApi,
  "delete safeParams.mchNo",
  "Merchant strips client merchant scope",
);
assert.doesNotMatch(
  merchantApi,
  /function\s+\w+AppleIap\w*\s*\(mchNo/,
  "Merchant operations must not accept mchNo",
);

const utilitySource = source(
  "jeepay-ui-manager/src/views/appleIap/appleIapUiUtils.ts",
);
const transformed = await transform(utilitySource, {
  loader: "ts",
  format: "esm",
  target: "es2020",
});
const utility = await import(
  `data:text/javascript;base64,${Buffer.from(transformed.code).toString("base64")}`
);
assert.equal(utility.formatScaledAmount("1999", 3, "usd"), "USD 1.999");
assert.equal(utility.formatScaledAmount("-5", 2, "cny"), "CNY -0.05");
assert.equal(utility.formatScaledAmount("12", null, "jpy"), "JPY 12");
assert.equal(utility.formatScaledAmount("7", 1000, "usd"), "USD 0.000000007");
assert.match(utility.newAppleIdempotencyKey(), /^[0-9a-f-]{36}$/i);

console.log(
  "Apple IAP operations UI contract: PASS (2 applications, 10 SFCs, scoped operations)",
);
