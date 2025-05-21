import './polyfill.js';

const tabIdToEditLink = {};
const tabIdToFocusLink = {};

function getEditLink(tabUrl) {
    // strip / from tab url
    tabUrl = tabUrl.replace(/\/$/, "");
    var tabDomain = new URL(tabUrl).hostname;

    return new Promise((resolve) => {
        chrome.storage.sync.get(
            { overrides: "" },
            (items) => {
                console.log("overrides", items.overrides, tabUrl);
                // create URLPattern from every key in items.overrides, then match

                for (const [key, value] of Object.entries(items.overrides)) {
                    // get only path, using URL
                    var keyURL = new URL(key);
                    var keyDomain = keyURL.hostname;
                    var keyPath = keyURL.pathname;

                    if (keyDomain !== tabDomain) {
                        continue;
                    }

                    const pattern = new URLPattern({ pathname: keyPath });
                    const match = pattern.exec(tabUrl);
                    console.log("match", match);
                    if (match) {
                        resolve(value + "?url=" + tabUrl);
                    }
                }
                if (items.overrides[tabUrl]) {
                    resolve(items.overrides[tabUrl] + "?url=" + tabUrl);
                } else if (tabIdToEditLink[tabUrl]) {
                    resolve(tabIdToEditLink[tabUrl]);
                } else {
                    resolve(null);
                }
            }
        );
    });
}

// Single click listener for all tabs
chrome.pageAction.onClicked.addListener((tab) => {
    console.log("page action clicked", tab);
    getEditLink(tab.url).then((editLink) => {
        console.log("edit link found", editLink);
        if (!editLink) {
            chrome.pageAction.hide(tab.id);
        } else {
            chrome.tabs.create({ url: editLink, active: true, index: tab.index + 1 });
        }
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("background.js received message", request);
    if (request.editLink) {
        chrome.pageAction.show(sender.tab.id);
        var tabUrl = sender.tab.url.replace(/\/$/, "");
        tabIdToEditLink[tabUrl] = request.editLink;
    }
    sendResponse({ success: true });
});

// on tab change, update icon
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        getEditLink(tab.url).then((editLink) => {
            if (!editLink) {
                chrome.pageAction.hide(tabId);
            } else {
                chrome.pageAction.show(tabId);
            }
        });
    }
});

// Clean up tab data when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    delete tabIdToEditLink[tabId];
});

chrome.commands.onCommand.addListener((command) => {
    if (command === "open-edit-link") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            getEditLink(tabs[0].url).then((editLink) => {
                if (editLink) {
                    chrome.tabs.create({ url: editLink, active: true, index: tabs[0].index + 1 });
                } else {
                    chrome.pageAction.show(tabs[0].id);
                }
            });
        });
    }
});
