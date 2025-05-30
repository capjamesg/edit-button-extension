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

            // rel="code repository" to link to the code file for a page in a repository. Good: combine multiple precise semantics to express an even more precise semantic. From IndieWeb dev chat 2025-05-25.
            // rel="directory repository" to link to the folder of the file for a page, in a repository, re-using pre-existing rel-directory semantics. From IndieWeb dev chat 2025-05-25.
            // rel="repository root" (order doesn't matter), or rel="repository home" to link to the repository root (or home) for the file for the current page. From IndieWeb dev chat 2025-05-25.

            if (items.lookForViewSource && !editLink) {
                var codeLinks = document.querySelectorAll('link[rel~="code"], a[rel~="code"]');
                var directoryLinks = document.querySelectorAll('link[rel~="directory"], a[rel~="directory"]');
                var repositoryLinks = document.querySelectorAll('link[rel~="repository"], a[rel~="repository"]');

                var sourceLink = null;

                if (codeLinks.length > 0) {
                    sourceLink = codeLinks[0];
                } else if (directoryLinks.length > 0) {
                    sourceLink = directoryLinks[0];
                } else if (repositoryLinks.length > 0) {
                    // we need to find the first repository link that has both "repository" and "home" or "root" in its rel attribute.
                    var matchingRepositoryLinksWithHomeOrRoot = null;
                    for (var i = 0; i < repositoryLinks.length; i++) {
                        if (repositoryLinks[i].rel.includes("repository") && (repositoryLinks[i].rel.includes("home") || repositoryLinks[i].rel.includes("root"))) {
                            matchingRepositoryLinksWithHomeOrRoot = repositoryLinks[i];
                            break;
                        }
                    }
                    sourceLink = matchingRepositoryLinksWithHomeOrRoot || repositoryLinks[0];
                }

                if (!sourceLink) {
                    var keywords = ["view source"];
                    sourceLink = scanPageAnchorsForText(keywords);
                }

                if (sourceLink) {
                    chrome.runtime.sendMessage({ sourceLink: sourceLink.href });
                }
            }

            chrome.runtime.sendMessage({ metadata: true, pageIsLikely404: pageIsLikely404 });
        }
    );
}

main();
document.addEventListener('DOMContentLoaded', main);
window.addEventListener('load', main);