import './polyfill.js';

const tabIdToEditLink = {};
const tabIdToPageIsLikely404 = {};

function composeURLParams (tabId, tabUrl) {
    return `?url=${encodeURIComponent(tabUrl)}${tabIdToPageIsLikely404[tabId] ? '&pageIsLikely404=true' : ''}`;
}


function getEditLink(tabUrl, tabId) {
    tabUrl = tabUrl.replace(/\/$/, "");
    const tabDomain = new URL(tabUrl).hostname;

    return new Promise((resolve) => {
        chrome.storage.sync.get({ overrides: {} }).then((items) => {
            for (const [key, value] of Object.entries(items.overrides)) {
                if (!key || !value) continue;
                const keyURL = new URL(key);
                const keyDomain = keyURL.hostname;
                const keyPath = keyURL.pathname;

                if (keyDomain !== tabDomain) continue;

                const pattern = new URLPattern({ pathname: keyPath });
                const match = pattern.exec(tabUrl);

                if (match) {
                    return resolve(`${value}` + composeURLParams(tabId, tabUrl));
                }
            }

            if (items.overrides[tabUrl]) {
                resolve(`${items.overrides[tabUrl]}` + composeURLParams(tabId, tabUrl));
            } else if (tabIdToEditLink[tabId]) {
                resolve(tabIdToEditLink[tabId]);
            } else {
                resolve(null);
            }
        });
    });
}

function openEditLink(tab) {
    getEditLink(tab.url, tab.id).then((editLink) => {
        if (!editLink) { return };
        chrome.storage.sync.get({ openInNewTab: false }).then((items) => {
            if (items.openInNewTab) {
                chrome.tabs.create({ url: editLink, active: true, index: tab.index + 1 });
            } else {
                chrome.tabs.update(tab.id, { url: editLink });
            }
        });
    });
}

const action = chrome.pageAction || chrome.action;

if (action && action.onClicked) {
    action.onClicked.addListener((tab) => {
        openEditLink(tab);
    });
}

chrome.runtime.onMessage.addListener((request, sender) => {
    const tabId = sender.tab.id;
    if (request.editLink && sender.tab) {
        tabIdToEditLink[tabId] = request.editLink;

        chrome.pageAction.show(tabId);
    } else if (request.metadata && sender.tab) {
        tabIdToPageIsLikely404[tabId] = request.pageIsLikely404;
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        getEditLink(tab.url, tabId).then((editLink) => {
            if (editLink) {
                chrome.pageAction.show(tabId);
            }
        });
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    delete tabIdToEditLink[tabId];
    delete tabIdToPageIsLikely404[tabId];
});

chrome.commands.onCommand.addListener((command) => {
    if (command === 'open-edit-link') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                openEditLink(tabs[0]);
            }
        });
    }
});

// if you go to a new page, reset the edit link
browser.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId === 0) { // only for main frame
        const tabId = details.tabId;
        delete tabIdToEditLink[tabId];
        delete tabIdToPageIsLikely404[tabId];
        chrome.pageAction.hide(tabId);
    }
}, { url: [{ urlMatches: '.*' }] });