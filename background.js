let logs = {};

chrome.webRequest.onCompleted.addListener(
    (details) => {
        const domain = new URL(details.url).hostname;

        if (!logs[domain]) {
            logs[domain] = { requests: 0, cookies: 0 };
        }

        logs[domain].requests++;

        chrome.storage.local.set({ logs });
    },
    { urls: ["<all_urls>"] }
);

chrome.cookies.onChanged.addListener((changeInfo) => {
    const domain = changeInfo.cookie.domain;

    if (!logs[domain]) {
        logs[domain] = { requests: 0, cookies: 0 };
    }

    logs[domain].cookies++;

    chrome.storage.local.set({ logs });
});