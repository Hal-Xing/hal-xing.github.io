// Short entry links (/ig/, /cv/, /mail/ ...): each one is its own path in Cloudflare Web Analytics,
// so visits can be split by where people came from. The page counts the visit, then forwards to
// data-to. It waits for the count to be sent (about 0.2 s), at most 1.5 s.
(function () {
    var to = document.currentScript.getAttribute('data-to') || '/';
    var gone = false;
    function go() {
        if (gone) return;
        gone = true;
        location.replace(to);
    }
    if (location.hostname !== 'hal-xing.github.io') { go(); return; }
    var cf = document.createElement('script');
    cf.type = 'module';
    cf.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    cf.setAttribute('data-cf-beacon', '{"token": "1d562acf9b04402e86e282e06ed90f44"}');
    document.head.appendChild(cf);
    try {
        new PerformanceObserver(function (list) {
            list.getEntries().forEach(function (e) {
                if (/cdn-cgi\/rum/.test(e.name)) go();
            });
        }).observe({ type: 'resource', buffered: true });
    } catch (e) {}
    setTimeout(go, 1500);
})();
