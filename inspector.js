import { trackerDomain, TRACKER_DOMAINS } from "./tracker-data.js";

export function createInspector(api) {
  let queue = Promise.resolve();
  let records;
  // Serialize storage changes so concurrent requests and toggles cannot overwrite each other.
  const run = fn => {
    const next = queue.then(fn);
    queue = next.catch(() => {});
    return next;
  };
  const load = async () => {
    if (!records) records = (await api.storage.session.get("tabActivity")).tabActivity || {};
  };
  const enabled = async () => (await api.declarativeNetRequest.getEnabledRulesets()).includes("trackers");
  const apply = async value => {
    await api.declarativeNetRequest.updateEnabledRulesets(value
      ? { enableRulesetIds: ["trackers"], disableRulesetIds: [] }
      : { enableRulesetIds: [], disableRulesetIds: ["trackers"] });
  };
  return {
    restore: () => run(async () => {
      const saved = await api.storage.local.get("blockingEnabled");
      await apply(saved.blockingEnabled === true);
    }),
    setBlocking: value => run(async () => {
      const previous = await enabled();
      await apply(value);
      try { await api.storage.local.set({ blockingEnabled: value }); }
      catch (error) { await apply(previous); throw error; }
      return { enabled: await enabled(), domainCount: TRACKER_DOMAINS.length };
    }),
    status: tabId => run(async () => {
      await load();
      return { enabled: await enabled(), domainCount: TRACKER_DOMAINS.length,
        activity: records[tabId] || { url: "", total: 0, domains: {}, trackers: {} } };
    }),
    record: details => run(async () => {
      if (details.tabId < 0 || !/^https?:\/\//.test(details.url)) return;
      await load();
      if (details.type === "main_frame" || !records[details.tabId]) {
        records[details.tabId] = { url: details.type === "main_frame" ? new URL(details.url).origin : details.initiator || "", total: 0, domains: {}, trackers: {} };
      }
      const activity = records[details.tabId];
      const host = new URL(details.url).hostname;
      activity.total++;
      if (Object.hasOwn(activity.domains, host) || Object.keys(activity.domains).length < 200) {
        activity.domains[host] = (activity.domains[host] || 0) + 1;
      }
      const tracker = trackerDomain(host);
      let siteTracker = null;
      try { siteTracker = trackerDomain(new URL(activity.url).hostname); } catch { /* No top-level navigation observed yet. */ }
      if (tracker && tracker !== siteTracker && details.type !== "main_frame") {
        activity.trackers[tracker] = (activity.trackers[tracker] || 0) + 1;
      }
      const keys = Object.keys(records);
      if (keys.length > 50) delete records[keys.find(key => key !== String(details.tabId))];
      await api.storage.session.set({ tabActivity: records });
    }),
    removeTab: tabId => run(async () => {
      await load();
      delete records[tabId];
      await api.storage.session.set({ tabActivity: records });
    })
  };
}
