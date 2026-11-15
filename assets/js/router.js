// Homepage router: every page opens in a frame on the right; the address keeps it as #/path/.
document.addEventListener('DOMContentLoaded', function () {
    const content = document.getElementById('preview-content');
    const loader = document.getElementById('preview-loader');

    // Menu links (desktop sidebar and phone menu) open in the frame; outside links open in a new tab.
    document.addEventListener('click', function (e) {
        const link = e.target.closest('.menu a');
        if (!link) return;
        const href = link.getAttribute('href');
        e.preventDefault();
        if (/^https?:\/\//.test(href)) {
            window.open(href, '_blank', 'noopener');
            return;
        }
        location.hash = href.startsWith('/') ? href : '/' + href;
    });

    function loadContent() {
        const path = location.hash.slice(1);
        if (!path) return;

        loader.style.display = 'block';
        const iframe = document.createElement('iframe');
        iframe.src = path;
        iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
        iframe.title = 'Page Content';
        iframe.onload = () => {
            loader.style.display = 'none';
            try {
                document.title = iframe.contentDocument.title;
            } catch (e) { /* page from another site: keep the title */ }
        };
        content.innerHTML = '';
        content.appendChild(iframe);
        updatePagePathDisplay(path);
    }

    // Page name next to MENU in the phone bar
    function updatePagePathDisplay(path) {
        const pathElement = document.getElementById('page-path');
        if (!pathElement) return;
        const parts = path.split('/').filter(p => p);
        if (parts.length > 0) {
            pathElement.textContent = parts[parts.length - 1]
                .replace(/-/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());
        }
    }

    window.addEventListener('hashchange', loadContent);

    if (location.hash) {
        loadContent();
    } else {
        // Hal, 2026-11-15: the homepage opens with Ground Breaking (replace, so Back does not bounce to the bare homepage)
        location.replace('#/web-projects/ground-breaking/');
    }
});
