const siteDomain = document.getElementById("siteDomain");
const totalRequests = document.getElementById("totalRequests");
const thirdPartyRequests = document.getElementById("thirdPartyRequests");
const cookieCount = document.getElementById("cookieCount");
const trackerSummary = document.getElementById("trackerSummary");
const cookiesSummary = document.getElementById("cookiesSummary");
const trackerList = document.getElementById("trackerList");
const cookiesList = document.getElementById("cookiesList");
const refreshButton = document.getElementById("refreshButton");
const viewDetailsButton = document.getElementById("viewDetailsButton");
const trackersToggle = document.getElementById("trackersToggle");
const trackersPanel = document.getElementById("trackersPanel");
const cookiesToggle = document.getElementById("cookiesToggle");
const cookiesPanel = document.getElementById("cookiesPanel");

function getHostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return "Unknown site"; }
}

function renderList(element, items, emptyText) {
  element.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = emptyText;
    element.appendChild(li);
    return;
  }
  items.slice(0, 8).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    element.appendChild(li);
  });
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getCookiesForTab(tab) {
  if (!tab?.url || !tab.url.startsWith("http")) return [];
  try { return await chrome.cookies.getAll({ url: tab.url }); }
  catch { return []; }
}

const blockingToggle = document.getElementById("blockingToggle");
const blockingStatus = document.getElementById("blockingStatus");
const protectionError = document.getElementById("protectionError");

function renderProtection(state) {
  blockingToggle.checked = state.enabled;
  blockingStatus.textContent = state.enabled
    ? `On · blocking ${state.domainCount} known tracker domains across all sites.`
    : "Off · browsing activity is only inspected.";
}

async function loadPopupData() {
  try {
    const tab = await getCurrentTab();
    const state = await chrome.runtime.sendMessage({ type: "get-status", tabId: tab?.id ?? -1 });
    if (!state?.ok) throw new Error(state?.error || "Unable to load extension data.");
    renderProtection(state);
    blockingToggle.disabled = false;
    const cookies = await getCookiesForTab(tab);
    const activity = state.activity;
    const trackers = Object.entries(activity.trackers);
    siteDomain.textContent = getHostname(tab?.url || "");
    totalRequests.textContent = activity.total;
    thirdPartyRequests.textContent = trackers.length;
    cookieCount.textContent = cookies.length;
    trackerSummary.textContent = `${trackers.length} known tracker domain${trackers.length === 1 ? "" : "s"} observed`;
    cookiesSummary.textContent = `${cookies.length} cookie${cookies.length === 1 ? "" : "s"} found`;
    renderList(trackerList, trackers.sort((a,b) => b[1] - a[1]).map(([domain, count]) => `${domain} — ${count} observed request${count === 1 ? "" : "s"}`), "No known tracker requests observed. Blocked requests are not included.");
    renderList(cookiesList, [...new Set(cookies.map(cookie => cookie.domain.replace(/^\./, "")))].sort(), "No cookies accessible for this page.");
    protectionError.textContent = "";
  } catch (error) {
    protectionError.textContent = error.message || "Unable to load data. Reload the extension and try again.";
  }
}

blockingToggle.addEventListener("change", async () => {
  const requested = blockingToggle.checked;
  blockingToggle.disabled = true;
  try {
    const state = await chrome.runtime.sendMessage({ type: "set-blocking", enabled: requested });
    if (!state?.ok) throw new Error(state?.error || "Unable to change tracker blocking.");
    renderProtection(state);
    protectionError.textContent = "";
  } catch (error) {
    blockingToggle.checked = !requested;
    protectionError.textContent = error.message || "Unable to change tracker blocking.";
  } finally {
    blockingToggle.disabled = false;
  }
});

function togglePanel(button, panel) {
  button.classList.toggle("open");
  panel.classList.toggle("open");
}

trackersToggle.addEventListener("click", () => togglePanel(trackersToggle, trackersPanel));
cookiesToggle.addEventListener("click", () => togglePanel(cookiesToggle, cookiesPanel));
refreshButton.addEventListener("click", loadPopupData);
viewDetailsButton.addEventListener("click", () => {
  trackersToggle.classList.add("open");
  trackersPanel.classList.add("open");
  cookiesToggle.classList.add("open");
  cookiesPanel.classList.add("open");
});

document.addEventListener("DOMContentLoaded", loadPopupData);
