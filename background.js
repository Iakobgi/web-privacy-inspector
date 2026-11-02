import { createInspector } from "./inspector.js";

const inspector = createInspector(chrome);
chrome.runtime.onInstalled.addListener(() => { void inspector.restore().catch(console.error); });
chrome.runtime.onStartup.addListener(() => { void inspector.restore().catch(console.error); });
chrome.webRequest.onBeforeRequest.addListener(
  details => { void inspector.record(details).catch(console.error); },
  { urls: ["http://*/*", "https://*/*"] }
);
chrome.tabs.onRemoved.addListener(tabId => { void inspector.removeTab(tabId).catch(console.error); });
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return false;
  const task = message?.type === "set-blocking" && typeof message.enabled === "boolean"
    ? inspector.setBlocking(message.enabled)
    : message?.type === "get-status" && Number.isInteger(message.tabId)
      ? inspector.status(message.tabId) : null;
  if (!task) return false;
  task.then(result => respond({ ok: true, ...result }))
    .catch(() => respond({ ok: false, error: "Unable to update protection. Please try again." }));
  return true;
});
