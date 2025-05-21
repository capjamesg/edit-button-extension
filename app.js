// get rel=edit then send message
var editLink = null;

var relEdit = document.querySelector('link[rel="edit"], a[rel="edit"]');

if (relEdit) {
    editLink = relEdit;
}

var wikiLink = document.querySelector('link[type="application/x-wiki"]');

if (wikiLink && !editLink) {
    editLink = wikiLink;
}

chrome.storage.sync.get(
    { naturalLanguageHeuristics: false },
    (items) => {
        if (!editLink && items.naturalLanguageHeuristics) {
            var KEYWORDS = ["edit ", "edit this page", "make a contribution", "view this page", "edit file"];
            for (var i = 0; i < document.links.length; i++) {
        if (!editLink && KEYWORDS.some(kw => document.links[i].textContent.toLowerCase().includes(kw) || document.links[i].title?.toLowerCase().includes(kw) || document.links[i].ariaLabel?.toLowerCase().includes(kw))) {
            editLink = document.links[i];
            break;
        }
            }
        }

        if (editLink) {
            chrome.runtime.sendMessage({ editLink: editLink.href });
        }
    }
);

