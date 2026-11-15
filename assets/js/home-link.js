// Shows a small "Hal Xing" link home when a project page is opened on its own
// (from Google or a shared link). Inside the homepage frame the menu is there, so nothing is shown.
(function () {
    if (window.self !== window.top) return;
    var a = document.createElement('a');
    a.href = '/';
    a.className = 'home-link';
    a.textContent = 'Hal Xing';
    a.style.cssText = 'position:fixed;right:12px;top:12px;z-index:9999;padding:6px 10px;' +
        'font-size:12px;letter-spacing:.04em;text-decoration:none;color:var(--text-color,#333);' +
        'background:var(--almost-white,#fefefe);border-radius:4px;opacity:.85;';
    document.body.appendChild(a);
})();
