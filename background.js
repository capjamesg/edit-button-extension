import './polyfill.js';

const tabIdToEditLink = {};

function getEditLink(tabUrl) {
    tabUrl = tabUrl.replace(/\/$/, "");
    const tabDomain = new URL(tabUrl).hostname;

    return new Promise((resolve) => {
        chrome.storage.sync.get({ overrides: {} }).then((items) => {
            for (const [key, value] of Object.entries(items.overrides)) {
                const keyURL = new URL(key);
                const keyDomain = keyURL.hostname;
                const keyPath = keyURL.pathname;

                if (keyDomain !== tabDomain) continue;

                const pattern = new URLPattern({ pathname: keyPath });
                const match = pattern.exec(tabUrl);

                if (match) {
                    return resolve(`${value}?url=${tabUrl}`);
                }
            }

            if (items.overrides[tabUrl]) {
                resolve(`${items.overrides[tabUrl]}?url=${tabUrl}`);
            } else if (tabIdToEditLink[tabUrl]) {
                resolve(tabIdToEditLink[tabUrl]);
            } else {
                resolve(null);
            }
        });
    });
}

if (chrome.pageAction) {
    chrome.pageAction.onClicked.addListener((tab) => {
        console.log("clicked");
        getEditLink(tab.url).then((editLink) => {
        if (editLink) {
            chrome.tabs.create({ url: editLink, active: true, index: tab.index + 1 });
        }
        });
    });
} else {
    chrome.action.onClicked.addListener((tab) => {
        getEditLink(tab.url).then((editLink) => {
            console.log("editLink", editLink);
            if (editLink) {
                chrome.tabs.create({ url: editLink, active: true, index: tab.index + 1 });
            }
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender) => {
    if (request.editLink && sender.tab) {
        const tabId = sender.tab.id;
        const tabUrl = sender.tab.url.replace(/\/$/, "");
        tabIdToEditLink[tabUrl] = request.editLink;

        chrome.pageAction.show(tabId);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        getEditLink(tab.url).then((editLink) => {
            if (editLink) {
                chrome.pageAction.show(tabId);
            }
        });
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    delete tabIdToEditLink[tabId];
});

chrome.commands.onCommand.addListener((command) => {
    if (command === "open-edit-link") {
        chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
            const tab = tabs[0];
            getEditLink(tab.url).then((editLink) => {
                if (editLink) {
                    chrome.tabs.create({ url: editLink, active: true, index: tab.index + 1 });
                } else {
                    chrome.pageAction.show(tab.id);
                }
            });
        });
    }
});
