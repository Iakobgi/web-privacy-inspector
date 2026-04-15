chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = new URL(tabs[0].url);
    const domain = url.hostname;

    chrome.storage.local.get("logs", (data) => {
        const siteData = data.logs?.[domain];

        if (!siteData) {
            document.getElementById("result").innerText = "No data yet";
            return;
        }

        const risk =
            siteData.requests > 50 || siteData.cookies > 20
                ? "High"
                : siteData.requests > 20
                    ? "Medium"
                    : "Low";

        document.getElementById("result").innerText =
            `Domain: ${domain}
Requests: ${siteData.requests}
Cookies: ${siteData.cookies}
Risk: ${risk}`;
    });
});