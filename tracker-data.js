export const TRACKER_DOMAINS = [
  "google-analytics.com",
  "doubleclick.net",
  "googlesyndication.com",
  "connect.facebook.net",
  "hotjar.com",
  "hotjar.io",
  "clarity.ms",
  "fullstory.com",
  "mixpanel.com",
  "segment.io",
  "scorecardresearch.com",
  "quantserve.com",
  "adsrvr.org",
  "criteo.com",
  "criteo.net"
];

export function trackerDomain(host) {
  return TRACKER_DOMAINS.find(domain => host === domain || host.endsWith("." + domain)) || null;
}
