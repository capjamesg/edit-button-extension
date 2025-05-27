function main () {
    console.log("Content script loaded on", window.location.href);
    var editLink =
        document.querySelector('link[rel="edit"], a[rel="edit"]') ||
        document.querySelector('link[type="application/x-wiki"]');
    var sourceLink = null;

    const pageIsLikely404 = document.title.includes('404') || document.title.toLowerCase().includes("not found") || (document.textContent && document.textContent.includes('Page Not Found')) || false;

    function scanPageAnchorsForText(keywords) {
        var foundLink = null;
        for (var i = 0; i < document.links.length; i++) {
            if (!editLink && keywords.some(kw => document.links[i].textContent.toLowerCase().includes(kw) || document.links[i].title?.toLowerCase().includes(kw) || document.links[i].ariaLabel?.toLowerCase().includes(kw))) {
                foundLink = document.links[i];
                break;
            }
        }
        return foundLink;
    }

    chrome.storage.sync.get(
        { naturalLanguageHeuristics: false, lookForViewSource: false },
        (items) => {
            if (!editLink && items.naturalLanguageHeuristics) {
                var KEYWORDS = ["edit this page", "make a contribution", "view this page", "edit file", "edit this file"];
                editLink = scanPageAnchorsForText(KEYWORDS);
            }

            if (editLink) {
                chrome.runtime.sendMessage({ editLink: editLink.href });
            }

            if (items.lookForViewSource && !editLink) {
                var keywords = ["view source"];
                sourceLink = scanPageAnchorsForText(keywords);

                if (sourceLink) {
                    chrome.runtime.sendMessage({ sourceLink: sourceLink.href });
                }
            }

            chrome.runtime.sendMessage({ metadata: true, pageIsLikely404: pageIsLikely404 });
        }
    );
}

main();