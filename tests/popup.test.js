import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function setup(failToggle = false) {
  const elements = new Map();
  const events = {};
  function node() {
    return { textContent: "", children: [], checked: false, disabled: true,
      addEventListener(type, callback) { this[type] = callback; },
      appendChild(child) { this.children.push(child); },
      classList: { toggle() {}, add() {} } };
  }
  const calls = [];
  const context = vm.createContext({ URL, chrome: {
    tabs: { query: async () => [{ id: 7, url: "https://example.com" }] },
    cookies: { getAll: async () => [] },
    runtime: { sendMessage: async message => {
      calls.push(message);
      if (message.type === "set-blocking") {
        return failToggle ? { ok: false, error: "Permission denied" } : { ok: true, enabled: message.enabled, domainCount: 15 };
      }
      return { ok: true, enabled: false, domainCount: 15, activity: { total: 3, trackers: { "hotjar.com": 1 } } };
    } }
  }, document: {
    getElementById(id) { if (!elements.has(id)) elements.set(id, node()); return elements.get(id); },
    createElement: node,
    addEventListener(type, callback) { events[type] = callback; }
  } });
  vm.runInContext(readFileSync(new URL("../popup/popup.js", import.meta.url), "utf8"), context);
  return { elements, events, calls };
}

test("popup loads only the active tab and shows the tracker list", async () => {
  const { elements, events, calls } = setup();
  await events.DOMContentLoaded();
  assert.equal(calls[0].tabId, 7);
  assert.equal(elements.get("totalRequests").textContent, 3);
  assert.equal(elements.get("thirdPartyRequests").textContent, 1);
  assert.equal(elements.get("blockingToggle").disabled, false);
  assert.match(elements.get("trackerList").children[0].textContent, /hotjar.com/);
});

test("popup switch activates the blocker and re-enables its control", async () => {
  const { elements, events, calls } = setup();
  await events.DOMContentLoaded();
  const toggle = elements.get("blockingToggle");
  toggle.checked = true;
  await toggle.change();
  assert.equal(calls[1].enabled, true);
  assert.match(elements.get("blockingStatus").textContent, /On.*15/);
  assert.equal(toggle.checked, true);
  assert.equal(toggle.disabled, false);
});

test("popup rolls its switch back and shows errors when blocking fails", async () => {
  const { elements, events } = setup(true);
  await events.DOMContentLoaded();
  const toggle = elements.get("blockingToggle");
  toggle.checked = true;
  await toggle.change();
  assert.equal(toggle.checked, false);
  assert.equal(toggle.disabled, false);
  assert.equal(elements.get("protectionError").textContent, "Permission denied");
});
