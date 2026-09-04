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
const componentFiles = [
  "src/views/order/pay/PayOrderList.vue",
  "src/views/order/refund/RefundOrderList.vue",
  "src/views/appleIap/AppleIapCenterPage.vue",
  "src/views/appleIap/components/AppleIapTransactionList.vue",
];

function source(relativePath) {
  return readFileSync(join(repositoryRoot, relativePath), "utf8");
}

function assertContains(haystack, needle, message) {
  assert.ok(haystack.includes(needle), `${message}: ${needle}`);
}

for (const application of applications) {
  for (const componentFile of componentFiles) {
    const relativePath = join(application.directory, componentFile);
    const filename = join(repositoryRoot, relativePath);
    const componentSource = source(relativePath);
    const parsed = parse(componentSource, { filename });
    assert.deepEqual(parsed.errors, [], `${relativePath} SFC parse errors`);
    const id = `apple-common-${application.name}-${componentFile.replace(/\W/g, "-")}`;
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
      /signedTransactionInfo|signedPayload|jwsCiphertext|appAccountToken|console\.(log|debug)/,
      `${relativePath} must not expose Apple proof or debug output`,
    );
  }

  const root = application.directory;
  const pay = source(`${root}/src/views/order/pay/PayOrderList.vue`);
  for (const field of [
    "channelEnvironment",
    "deliveryState",
    "channelAmountText",
    "finishStateMeta",
    "channelProductId",
  ]) {
    assertContains(pay, field, `${application.name} Apple pay field`);
  }
  assertContains(
    pay,
    "$access('ENT_PAY_ORDER_REFUND') && !isAppleIapOrder(record)",
    `${application.name} Apple refund button gate`,
  );
  assertContains(
    pay,
    "Apple IAP 不支持商户主动退款",
    `${application.name} Apple refund explanation`,
  );
  assertContains(
    pay,
    "openAppleTransaction(record)",
    `${application.name} Apple transaction deep link`,
  );
  assertContains(
    pay,
    "overflow-wrap: anywhere",
    `${application.name} long Apple amount/status wrapping`,
  );

  const refund = source(`${root}/src/views/order/refund/RefundOrderList.vue`);
  for (const field of [
    "refundOrigin",
    "providerEventId",
    "refundType",
    "channelRefundAmountText",
    "revocationReason",
    "reversedTime",
  ]) {
    assertContains(refund, field, `${application.name} channel refund field`);
  }
  assertContains(
    refund,
    "退款已撤销",
    `${application.name} reversed state is not rendered as failed`,
  );
  assertContains(
    refund,
    ':copyable="{ text: vdata.detailData.providerEventId }"',
    `${application.name} long provider event is copyable`,
  );
  assertContains(
    refund,
    "overflow-wrap: anywhere",
    `${application.name} long refund evidence wrapping`,
  );

  const center = source(`${root}/src/views/appleIap/AppleIapCenterPage.vue`);
  assertContains(
    center,
    "requestedTab",
    `${application.name} requested tab gate`,
  );
  assertContains(
    center,
    "initial-pay-order-id",
    `${application.name} common-order deep link target`,
  );

  const transactionList = source(
    `${root}/src/views/appleIap/components/AppleIapTransactionList.vue`,
  );
  assertContains(
    transactionList,
    "initialPayOrderId",
    `${application.name} initial pay-order filter`,
  );
  assertContains(
    transactionList,
    "vdata.records.length === 1",
    `${application.name} exact result opens detail`,
  );
}

console.log(
  "Apple IAP common order UI contract: PASS (2 applications, 8 SFCs)",
);
