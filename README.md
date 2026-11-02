# Privacy Inspector / Web Shield

A Manifest V3 Chrome extension for inspecting current-tab request activity and cookies, with an optional tracker blocker. Version 1.1.0.

## Tracker protection

Enable **Block trackers** in the popup to activate the bundled Chrome declarativeNetRequest rules. The switch applies across sites and starts off on a fresh installation. Its setting survives browser restarts and extension updates. Disabling the switch removes only this extension’s tracker rules.

The bundled list contains 15 known tracker domains and matches their subdomains. Rules block third-party subresource requests (including scripts, images, fetch/XHR, beacons and subframes); they do not block top-level navigation or first-party requests. This is a small, manually maintained list, not comprehensive tracking protection. No remote list or external service is contacted by the blocker.

Reload an already-open page after enabling protection to prevent matching requests during page load. If a page feature stops working, turn protection off and reload it. The extension does not remove existing cookies.

## Activity display

Request counts are scoped to the current tab and reset on top-level navigation. Only known tracker domains are labeled as trackers: unrelated third-party domains are not assumed to be trackers. The popup counts observed requests, not confirmed blocked requests; Chrome can block a request before the inspection listener sees it. An empty tracker list therefore does not mean a page is tracker-free.

Activity is kept in session storage, cleared when the browser session ends, and removed when a tab closes. Up to 50 tabs and 200 observed domains per tab are retained. Cookie inspection shows cookies accessible for the active page URL, not every cookie in the browser. Protection preferences are stored locally. Nothing is uploaded by the extension.

## Install or update locally

1. Download the repository and extract it.
2. Open `chrome://extensions` and enable Developer mode.
3. Choose **Load unpacked** and select the folder containing `manifest.json`.
4. When updating an existing unpacked copy, replace its files and select **Reload** on its extension card. Review Chrome’s permission notice if prompted.
5. Open a normal HTTP(S) page, reload it, then open the extension popup.

Chrome 102+ is required. Other Chromium browsers may work if they support these extension APIs; Firefox support is not claimed. GitHub publication does not install or update the extension automatically, and this repository is not a Chrome Web Store release.

## Permissions

- `activeTab`, `tabs`: identify the page being inspected.
- `cookies`: inspect cookies accessible for the current page.
- `storage`: save the protection preference and temporary tab activity.
- `webRequest` and HTTP(S) host access: observe requests by tab.
- `declarativeNetRequestWithHostAccess`: enable the bundled blocking rules using the existing host access.

## Validation

Run `npm test` (or `node --test tests/*.test.js`). Tests cover rule/detection consistency, domain boundaries, tab isolation, navigation reset, worker restoration, settings persistence, disabling and failure rollback with mocked Chrome APIs. They do not replace a real Chromium extension smoke test.

For manual verification, load unpacked in Chrome, inspect the extension service worker for errors, and use the Network panel on a page that requests a listed tracker. Compare protection off/on with a page reload: matching third-party requests should show `ERR_BLOCKED_BY_CLIENT` when enabled. Confirm turning it off permits requests again, non-listed resources still load, the toggle survives restarting Chrome, and opening two tabs does not mix their activity. Do not mistake CORS or other extensions’ blocks for this extension’s rules.

## API reference

- https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
- https://developer.chrome.com/docs/extensions/reference/api/storage
