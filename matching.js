(async () => {
    if (!globalThis.URLPattern) {
        await import('https://cdn.jsdelivr.net/npm/urlpattern-polyfill@10.1.0/+esm');
    }

    var pattern = new URLPattern({
        pathname: "/edit"
    });

    var match = pattern.exec("https://jamesg.blog/edit");
    console.log("match", match);
})();
