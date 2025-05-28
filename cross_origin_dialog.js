var currentPageUrl = window.location.href;

function get (i) {
    return document.getElementById(i);
}

function show (is) {
    is.forEach(i => {
        get(i).style.display = 'block';
    });
}

function main() {
    // send message to background.js
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            var tabId = tabs[0].id;
            var tabUrl = tabs[0].url;
            chrome.runtime.sendMessage({ getCrossOriginState: true, tabId: tabId }, (response) => {
                var state = response.state;
                if (state == "ask-for-permission") {
                    get('domain-name').textContent = new URL(tabUrl).hostname;
                    if (response.editLink) {
                        get('task').textContent = 'edit';
                        get('site-name').textContent = new URL(response.editLink).hostname;
                    } else if (response.sourceLink) {
                        get('task').textContent = 'view source';
                        get('site-name').textContent = new URL(response.sourceLink).hostname;
                    }
                    show(['approve-deny-message', 'buttons']);
                } 

                var editLink = response.editLink || null;
                var editDomain = editLink ? new URL(editLink).hostname : "this site";
                var currentPageDomain = new URL(tabUrl).hostname;
                
                if (state == "denied") {
                    get('previously-denied-message').textContent = "You previously denied access to use " + editDomain + " for editing " + currentPageDomain + ". If you want to edit this page, you can approve the request again.";
                    show(['origin-changed-message', 'buttons']);
                } else if (state == "origin-changed") {
                    get('origin-changed-message').textContent = "The editing origin has changed from " + editDomain + " to " + currentPageDomain + ". If you want to edit this page, you can approve the new origin.";

                    show(['origin-changed-message', 'buttons']);
                } else {
                    show(['loading-message'])
                }
            });
        }
    });

    var approveButton = get('approve-button');
    var denyButton = get('deny-button');

    approveButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                var tabId = tabs[0].id;
                chrome.runtime.sendMessage({ approveCrossOriginRequest: true, openEditLink: true, tabId: tabId });
            }
        });
    });

    denyButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                var tabId = tabs[0].id;
                chrome.runtime.sendMessage({ denyCrossOriginRequest: true, tabId: tabId });
            }
        });
    });
}


document.addEventListener('DOMContentLoaded', main);
