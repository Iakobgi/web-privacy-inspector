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

function getRootDomain(hostname) {
  const parts = hostname.replace(/^www\./, "").split(".");
  return parts.length > 2 ? parts.slice(-2).join(".") : hostname;
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

async function loadPopupData() {
  const tab = await getCurrentTab();
  const hostname = getHostname(tab?.url || "");
  const rootDomain = getRootDomain(hostname);
  const cookies = await getCookiesForTab(tab);

  chrome.storage.local.get(["logs"], ({ logs = {} }) => {
    const logEntries = Object.entries(logs);
    const currentLog = logs[hostname] || logs[rootDomain] || { requests: 0, cookies: 0 };

    const thirdParties = logEntries
      .filter(([domain]) => domain && getRootDomain(domain) !== rootDomain)
      .sort((a, b) => (b[1].requests || 0) - (a[1].requests || 0))
      .map(([domain, data]) => `${domain} - ${data.requests || 0} request${(data.requests || 0) > 1 ? "s" : ""}`);

    const cookieDomains = [...new Set(cookies.map((cookie) => cookie.domain.replace(/^\./, "")))]
      .sort();

    siteDomain.textContent = hostname;
    totalRequests.textContent = currentLog.requests || 0;
    thirdPartyRequests.textContent = thirdParties.length;
    cookieCount.textContent = cookies.length;

    trackerSummary.textContent = thirdParties.length
      ? `${thirdParties.length} tracker${thirdParties.length > 1 ? "s" : ""} detected`
      : "No trackers detected";

    cookiesSummary.textContent = cookies.length
      ? `${cookies.length} cookie${cookies.length > 1 ? "s" : ""} found`
      : "No cookies found";

    renderList(trackerList, thirdParties, "No third-party trackers detected on this page.");
    renderList(cookiesList, cookieDomains, "No cookies found on this page.");
  });
}

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
