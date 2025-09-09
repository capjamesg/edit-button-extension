import './polyfill.js';
var isFirefox = typeof InstallTrigger !== 'undefined';

const tabIdToEditLink = {};
const tabIdToPageIsLikely404 = {};
const tabIdToSourceLink = {};

var crossOriginStateGlobal = {};
var overrides = {};

function composeURLParams (tabId, tabUrl) {
    return `?url=${encodeURIComponent(tabUrl)}${tabIdToPageIsLikely404[tabId] ? '&pageIsLikely404=true' : ''}`;
}

function setCrossOriginState (tabDomain, linkType, originDomain = null, state = "approved") {
    chrome.storage.sync.get({ crossOriginState: "{}" }, (items) => {
        var decoded = JSON.parse(items.crossOriginState);
        if (!decoded[tabDomain]) {
            decoded[tabDomain] = {};
        }
        if (!originDomain) {
            console.log("Removing cross-origin state for", tabDomain, "and link type", linkType);
            delete decoded[tabDomain];
        } else {
            decoded[tabDomain][linkType] = {
                "url": originDomain,
                "state": state
            };
        }
        // decoded[tabDomain] = {
        //     "source": {"url": null, "state": null},
        //     "edit": {"url": tabDomain, "state": "denied"}
        // }
        chrome.storage.sync.set({ crossOriginState: JSON.stringify(decoded) }, () => {
            console.log("state updated:", decoded);
        });
    });
}

function matchOverrides (overrides, tabDomain, tabUrl) {
    for (const [key, value] of Object.entries(overrides)) {
        if (!key || !value) continue;
        const keyURL = new URL(key);
        const keyDomain = keyURL.hostname;
        const keyPath = keyURL.pathname;

        if (keyDomain !== tabDomain) continue;

        const pattern = new URLPattern({ pathname: keyPath });
        const match = pattern.exec(tabUrl);

        if (match) {
            return value;
        }
    }
}

function getLink(tabUrl, tabId, linkType = "edit") {
    tabUrl = tabUrl.replace(/\/$/, "");
    const tabDomain = new URL(tabUrl).hostname;

    if (linkType === "edit") {
        var map = tabIdToEditLink;
    } else {
        var map = tabIdToSourceLink;
    }

    return new Promise((resolve) => {
        chrome.storage.sync.get({ overrides: {} }).then((items) => {
            var overrides = items.overrides || {};
            var match = matchOverrides(overrides, tabDomain, tabUrl);
            if (match) {
                return resolve(`${match}` + composeURLParams(tabId, tabUrl));
            }
            if (items.overrides[tabUrl]) {
                resolve(`${items.overrides[tabUrl]}` + composeURLParams(tabId, tabUrl));
            } else if (map[tabId]) {
                resolve(map[tabId]);
            } else {
                resolve(null);
            }
        });
    });
}

function openLink(tab, linkType = "edit") {
    return new Promise((resolve) => {
        getLink(tab.url, tab.id, linkType).then((editLink) => {
            if (!editLink) { return };
            var editLinkDomain = new URL(editLink).hostname;
            var tabDomain = new URL(tab.url).hostname;
            // request cross origin
            chrome.storage.sync.get({ crossOriginState: "{}" }, (items) => {
                var decoded = JSON.parse(items.crossOriginState);
                var crossOriginPermitted = decoded[tabDomain] && decoded[tabDomain][linkType] && decoded[tabDomain][linkType].state === "approved";
                // if cross origin approved, the tab can be updated
                // otherwise, the request is denied
                // the cross origin pop up will handle the request
                // the pop up will ask for user input depending on the cross origin state
                // then the request can be re-initiated where crossOriginPermitted would evaluate
                // to true or false depending on the user's input
                // console.log("Cross-origin state for", tabDomain, ":", crossOriginPermitted);
                if (editLinkDomain === tabDomain || crossOriginPermitted || matchOverrides(overrides, tabDomain, tab.url)) {
                    console.info("Edit request approved. Opening link:", editLink);
                    chrome.storage.sync.get({ openInNewTab: false }).then((items) => {
                        if (items.openInNewTab) {
                            chrome.tabs.create({ url: editLink, active: true, index: tab.index + 1 });
                        } else {
                            if (linkType === "edit") {
                                tabIdToEditLink[tab.id] = editLink;
                            } else {
                                tabIdToSourceLink[tab.id] = editLink;
                            }

                            console.error("Opening link in current tab:", editLink);
                            
                            chrome.tabs.update(tab.id, { url: editLink, loadReplace: false });

                            resolve({ message: "linkOpened", tabId: tab.id, linkType: linkType  });

                            return true;
                        }
                    });
                }
            });
        });
        resolve();
        return true;
    });
}

const action = chrome.pageAction || chrome.action;

// save global
chrome.storage.sync.get({ crossOriginState: "{}", overrides: {} }, (items) => {
    crossOriginStateGlobal = JSON.parse(items.crossOriginState);
    console.log("Cross-origin state loaded:", crossOriginStateGlobal);
    overrides = items.overrides || {};
});

if (action && action.onClicked) {
    action.onClicked.addListener((tab) => {
        console.log("Action clicked for tab:", tab.id, "with URL:", tab.url);
        openLink(tab, "edit").then((result) => {
            console.log("Opening source link for tab:", tab.id);
            if (tabIdToSourceLink[tab.id] && !tabIdToEditLink[tab.id]) {
                openLink(tab, "source");
            }
        });
        var tabDomain = new URL(tab.url).hostname;
        var linkType = tabIdToEditLink[tab.id] ? "edit" : "source";
        var crossOriginPermitted = crossOriginStateGlobal[tabDomain] && crossOriginStateGlobal[tabDomain][linkType] && crossOriginStateGlobal[tabDomain][linkType].state === "approved";

        if (matchOverrides(overrides, tabDomain, tab.url)) {
            return;
        }
        if (!crossOriginPermitted) { // && new URL(tab.url).hostname !== new URL(tabIdToEditLink[tab.id] || tabIdToSourceLink[tab.id]).hostname) {
            action.setPopup({ popup: 'cross_origin_dialog.html', tabId: tab.id });
            action.openPopup();
        }
    });
}

// if user presses back button
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    console.log("onHistoryStateUpdated event:", details);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    var tabId = null;
    console.log("Message received in background script:", request, "from sender:", sender);

    if (sender && sender.tab) {
        tabId = sender.tab.id;
    } else {
        tabId = request.tabId || null;
    }
    if (request.editLink && sender.tab) {
        tabIdToEditLink[tabId] = request.editLink;

        if (isFirefox) {
            chrome.pageAction.setIcon({path: {16:"assets/pen.svg"}, tabId: tabId});
            chrome.pageAction.show(tabId);
        } else {
            chrome.action.setIcon({path: {16:"assets/pen.png"}, tabId: tabId});
        }
    } else if (request.sourceLink && sender.tab) {
        console.log("Source link found:", request.sourceLink);
        tabIdToSourceLink[tabId] = request.sourceLink;

        if (isFirefox) {
            chrome.pageAction.setIcon({path: {16:"assets/source.svg"}, tabId: tabId});
            chrome.pageAction.show(tabId);
        } else {
            chrome.action.setIcon({path: {16:"assets/source.png"}, tabId: tabId});
        }
    } else if (request.metadata && sender.tab) {
        tabIdToPageIsLikely404[tabId] = request.pageIsLikely404;
    }

    if (request.editLink === null && sender.tab) {
        console.log("No edit link found for tab:", tabId, "with URL:", sender.tab.url);
        delete tabIdToEditLink[tabId];
        // hide icon
        chrome.pageAction?.hide(tabId);
    }

    var requestType = tabIdToEditLink[tabId] ? "edit" : "source";
    var linkToOpen = tabIdToEditLink[tabId] || tabIdToSourceLink[tabId];

    if (!linkToOpen && !isFirefox) {
        console.warn("No link to open for tab:", tabId, "with URL:", sender.tab.url);
        chrome.action.setIcon({path: {16:"assets/pen_with_strike_through.png"}, tabId: tabId});
    }

    chrome.tabs.get(tabId, (tab) => {
        if (request.openEditLink) {
            setCrossOriginState(new URL(tab.url).hostname, requestType, new URL(linkToOpen).hostname, "approved");
            openLink(tab, requestType);
        } else if (request.denyCrossOriginRequest) {
            setCrossOriginState(new URL(tab.url).hostname, requestType, new URL(linkToOpen).hostname, "null");
        } else if (request.revokeCrossOriginRequest) {
            console.log("Revoke cross-origin request for domain:", request.domain);
            setCrossOriginState(request.domain, requestType);
        } else if (request.getCrossOriginState) {
            var tabDomain = new URL(tab.url).hostname;
            var task = tabIdToEditLink[tabId] ? "edit" : "source";
            var state = crossOriginStateGlobal[tabDomain] && crossOriginStateGlobal[tabDomain][task] ? crossOriginStateGlobal[tabDomain][task].state : "ask-for-permission";

            var approved = new URL(tabIdToEditLink[tabId] || tabIdToSourceLink[tabId])?.hostname === tabDomain;

            // if the page the user has viewing has appointed a new origin for its edit link
            // the user will be asked to re-approve
            // this ensures that a user is never taken to an origin they have not explicitly approved
            var linkUrl = crossOriginStateGlobal[tabDomain]?.edit?.url || null;
            if (linkUrl && linkUrl !== new URL(linkToOpen).hostname) {
                state = "origin-changed";
            }
            if (approved) {
                state = "approved";
            }
            var response = {
                state: state,
                editLink: tabIdToEditLink[tabId] || null,
                sourceLink: tabIdToSourceLink[tabId] || null,
                pageIsLikely404: tabIdToPageIsLikely404[tabId] || false,
            };
            sendResponse(response);
        }
    });

    return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        getLink(tab.url, tabId).then((editLink) => {
            if (editLink) {
                // if firefox, use chrome.pageAction, else use chrome.action
                if (chrome.pageAction) {
                    tabIdToEditLink[tabId] = editLink;
                    chrome.pageAction.setIcon({path: {16:"assets/pen.svg"}, tabId: tabId});
                    chrome.pageAction.show(tabId);
                } else {
                    chrome.action.setIcon({path: {16:"assets/pen.png"}, tabId: tabId});
                    // chrome.action.show(tabId);
                }
            }
        });
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    delete tabIdToEditLink[tabId];
    delete tabIdToPageIsLikely404[tabId];
    delete tabIdToSourceLink[tabId];
});

chrome.commands.onCommand.addListener((command) => {
    if (command === 'open-edit-link') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            var requestType = tabIdToEditLink[tabs[0].id] ? "edit" : "source";
            if (tabs.length > 0) {
                openLink(tabs[0], requestType);
            }
        });
    }
});

// if user navigates to new page, reset the edit link

var browser = chrome || browser;

browser.storage.onChanged.addListener((changes, areaName) => {
    console.log("Storage changes detected:", changes, areaName);
  crossOriginStateGlobal = changes.crossOriginState ? JSON.parse(changes.crossOriginState.newValue) : {};
  console.log("Cross-origin state updated:", crossOriginStateGlobal);
  overrides = changes.overrides ? changes.overrides.newValue : {};
});

// listen for back button / forward button click
chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId === 0) {
        console.log("Web navigation committed:", details);
        delete tabIdToEditLink[details.tabId];
        delete tabIdToPageIsLikely404[details.tabId];
        delete tabIdToSourceLink[details.tabId];
        if (chrome.pageAction) {
            chrome.pageAction.hide(details.tabId);
        } else {
            chrome.action.setIcon({path: {16:"assets/pen_with_strike_through.png"}, tabId: details.tabId});
        }
        // trigger app.js script again
        chrome.scripting.executeScript({
            target: { tabId: details.tabId },
            files: ['app.js']
        });
    }
});