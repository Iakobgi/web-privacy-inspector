import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInspector } from "../inspector.js";
import { TRACKER_DOMAINS, trackerDomain } from "../tracker-data.js";

function setup(saved = {}) {
  const local = { ...saved };
  const session = {};
  let active = [];
  const api = {
    storage: {
      local: { get: async () => structuredClone(local), set: async value => Object.assign(local, value) },
      session: { get: async () => structuredClone(session), set: async value => Object.assign(session, structuredClone(value)) }
    },
    declarativeNetRequest: {
      getEnabledRulesets: async () => [...active],
      updateEnabledRulesets: async ({ enableRulesetIds, disableRulesetIds }) => {
        active = [...new Set([...active.filter(id => !disableRulesetIds.includes(id)), ...enableRulesetIds])];
      }
    }
  };
  return { api, local, session, inspector: createInspector(api) };
}
const request = (tabId, url, type = "script") => ({ tabId, url, type, initiator: "https://example.com" });

test("blocking is off on first install and toggles off/on without changing unrelated rulesets", async () => {
  const { inspector, api } = setup();
  await api.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: ["another"], disableRulesetIds: [] });
  await inspector.restore();
  assert.equal((await inspector.status(1)).enabled, false);
  assert.equal((await inspector.setBlocking(true)).enabled, true);
  assert.equal((await inspector.setBlocking(false)).enabled, false);
  assert.deepEqual(await api.declarativeNetRequest.getEnabledRulesets(), ["another"]);
});

test("saved protection is restored after restart or update", async () => {
  const { api, inspector } = setup();
  await inspector.setBlocking(true);
  await api.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: [], disableRulesetIds: ["trackers"] });
  const restarted = createInspector(api);
  await restarted.restore();
  assert.equal((await restarted.status(1)).enabled, true);
});

test("a failed ruleset update does not save a false success", async () => {
  const { inspector, api, local } = setup();
  api.declarativeNetRequest.updateEnabledRulesets = async () => { throw new Error("failure"); };
  await assert.rejects(inspector.setBlocking(true));
  assert.equal(local.blockingEnabled, undefined);
});

test("a storage failure rolls the browser rules back", async () => {
  const { inspector, api } = setup();
  api.storage.local.set = async () => { throw new Error("full"); };
  await assert.rejects(inspector.setBlocking(true));
  assert.equal((await inspector.status(1)).enabled, false);
});

test("concurrent requests stay separated by tab and unknown CDNs are not trackers", async () => {
  const { inspector } = setup();
  await inspector.record(request(1, "https://example.com", "main_frame"));
  await Promise.all([
    inspector.record(request(1, "https://www.google-analytics.com/collect")),
    inspector.record(request(1, "https://cdn.example.net/script.js")),
    inspector.record(request(2, "https://another.org", "main_frame"))
  ]);
  const first = (await inspector.status(1)).activity;
  assert.equal(first.total, 3);
  assert.deepEqual(first.trackers, { "google-analytics.com": 1 });
  assert.equal((await inspector.status(2)).activity.total, 1);
});

test("page navigation resets counters and closing a tab removes its history", async () => {
  const { inspector } = setup();
  await inspector.record(request(1, "https://google-analytics.com/collect"));
  await inspector.record(request(1, "https://next.org", "main_frame"));
  assert.deepEqual((await inspector.status(1)).activity.trackers, {});
  assert.equal((await inspector.status(1)).activity.total, 1);
  await inspector.removeTab(1);
  assert.equal((await inspector.status(1)).activity.total, 0);
});

test("activity survives worker suspension without persisting browsing history to disk", async () => {
  const { inspector, api, local } = setup();
  await inspector.record(request(4, "https://example.com", "main_frame"));
  assert.equal((await createInspector(api).status(4)).activity.total, 1);
  assert.deepEqual(local, {});
});

test("top-level tracker sites and first-party tracker resources are not labeled third party", async () => {
  const { inspector } = setup();
  await inspector.record(request(1, "https://hotjar.com", "main_frame"));
  await inspector.record(request(1, "https://static.hotjar.com/app.js"));
  assert.deepEqual((await inspector.status(1)).activity.trackers, {});
});

test("tracker matching requires domain boundaries", () => {
  assert.equal(trackerDomain("stats.google-analytics.com"), "google-analytics.com");
  assert.equal(trackerDomain("google-analytics.com.example.org"), null);
  assert.equal(trackerDomain("notgoogle-analytics.com"), null);
});

test("bundled DNR rules match the detection list and protect only third-party subresources", () => {
  const rules = JSON.parse(readFileSync(new URL("../rules/trackers.json", import.meta.url)));
  const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url)));
  assert.equal(manifest.declarative_net_request.rule_resources[0].enabled, false);
  assert(manifest.permissions.includes("declarativeNetRequestWithHostAccess"));
  assert.equal(rules.length, TRACKER_DOMAINS.length);
  assert.equal(new Set(rules.map(rule => rule.id)).size, rules.length);
  rules.forEach((rule, i) => {
    assert.equal(rule.condition.urlFilter, `||${TRACKER_DOMAINS[i]}^`);
    assert.equal(rule.condition.domainType, "thirdParty");
    assert.equal(rule.action.type, "block");
    assert(!rule.condition.resourceTypes.includes("main_frame"));
  });
});
