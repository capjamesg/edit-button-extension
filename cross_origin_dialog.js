var currentPageUrl = window.location.href;

function main() {
    // send message to background.js
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            var tabId = tabs[0].id;
            var tabUrl = tabs[0].url;
            // send message to background.js to get rel=edit link
            chrome.runtime.sendMessage({ getCrossOriginState: true, tabId: tabId }, (response) => {
                var state = response.state;
                console.log("Cross-origin state:", state, response);
                if (state == "ask-for-permission") {
                    document.getElementById('approve-deny-message').style.display = 'block';
                    document.getElementById('domain-name').textContent = new URL(tabUrl).hostname;
                    if (response.editLink) {
                        document.getElementById('task').textContent = 'edit';
                        document.getElementById('site-name').textContent = new URL(response.editLink).hostname;
                    } else if (response.sourceLink) {
                        document.getElementById('task').textContent = 'view source';
                        document.getElementById('site-name').textContent = new URL(response.sourceLink).hostname;
                    }
                    document.getElementById('buttons').style.display = 'block';
                } else if (state == "denied") {
                    // show previously-denied-message
                    var editLink = response.editLink || null;
                    var editDomain = editLink ? new URL(editLink).hostname : "this site";
                    var currentPageDomain = new URL(tabUrl).hostname;
                    document.getElementById('previously-denied-message').style.display = 'block';
                    document.getElementById('previously-denied-message').textContent = "You previously denied access to use " + editDomain + " for editing " + currentPageDomain + ". If you want to edit this page, you can approve the request again.";
                    // show buttons
                    document.getElementById('buttons').style.display = 'block';
                } else if (state == "origin-changed") {
                    var editLink = response.editLink || null;
                    var editDomain = editLink ? new URL(editLink).hostname : "this site";
                    var currentPageDomain = new URL(tabUrl).hostname;
                    document.getElementById('origin-changed-message').style.display = 'block';
                    document.getElementById('origin-changed-message').textContent = "The editing origin has changed from " + editDomain + " to " + currentPageDomain + ". If you want to edit this page, you can approve the new origin.";
                    document.getElementById('buttons').style.display = 'block';
                }
            });
        }
    });

    var approveButton = document.getElementById('approve-button');
    var denyButton = document.getElementById('deny-button');

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
