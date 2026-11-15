// Shared layout for every page: the sidebar menu (desktop) and the bottom bar with MENU (phone).
// The menu is written once, here. To add a page to the menu, add a line to MENU.
(function () {
    var MENU = [
        ['Web Projects', [
            ['/web-projects/nai-ken-ten-kai/', 'NAI(T/K)ENKAI'],
            ['/web-projects/ground-breaking/', 'Ground Breaking'],
            ['/web-projects/receipt-printer/', 'Receipt Printer']
        ]],
        ['Other Projects', [
            ['/other-projects/high-lighting-and-ground-breaking/', 'Ground-breaking & High-lighting'],
            ['/other-projects/modeled-nightscapes/', 'Modeled Nightscapes'],
            ['/other-projects/surface-of-the-city/', 'Surface of the City'],
            ['/other-projects/foggy-sometimes-sunny/', 'Foggy, Sometimes Sunny']
        ]],
        ['About', [
            ['/resume/', 'Resume / CV']
        ]]
    ];

    // Old addresses like /#/resume/ (from the framed homepage) go to the real page.
    if (/^#\//.test(location.hash)) {
        location.replace(location.hash.slice(1));
        return;
    }

    // The homepage shows Ground Breaking, so that entry is marked there.
    var here = location.pathname === '/' || location.pathname === '/index.html'
        ? '/web-projects/ground-breaking/' : location.pathname;
    var currentLabel = '';

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text) e.textContent = text;
        return e;
    }

    function menuLists() {
        var frag = document.createDocumentFragment();
        MENU.forEach(function (group) {
            frag.appendChild(el('div', 'category', group[0]));
            var ul = el('ul', 'menu');
            group[1].forEach(function (item) {
                var li = el('li'), a = el('a', '', item[1]);
                a.href = item[0];
                if (here.indexOf(item[0]) === 0) {
                    a.className = 'active';
                    a.setAttribute('aria-current', 'page');
                    a.appendChild(el('span', 'arrow-indicator', '→'));
                    currentLabel = item[1];
                }
                li.appendChild(a);
                ul.appendChild(li);
            });
            frag.appendChild(ul);
        });
        return frag;
    }

    function homeTitle(tag) {
        var h = el(tag), a = el('a', 'site-home', 'Hal Xing');
        a.href = '/';
        h.appendChild(a);
        return h;
    }

    // Desktop sidebar
    var sidebar = el('nav', 'sidebar');
    sidebar.setAttribute('aria-label', 'Site');
    var header = el('header');
    header.appendChild(homeTitle('div'));
    sidebar.appendChild(header);
    sidebar.appendChild(menuLists());

    // Phone bar
    var bar = el('nav', 'mobile-menu');
    bar.setAttribute('aria-label', 'Site');
    var head = el('div', 'mobile-header');
    var left = el('div', 'page-path-container');
    var toggle = el('button', 'menu-toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.appendChild(el('span', 'menu-arrow', '>'));
    toggle.appendChild(document.createTextNode(' MENU'));
    left.appendChild(toggle);
    // Pages outside the menu show their own title, without the name
    if (!currentLabel) {
        currentLabel = document.title.replace(/\s*[-|–]\s*Hal Xing\s*$/i, '').replace(/^Hal Xing\s*[-|–]\s*/i, '');
    }
    left.appendChild(el('span', 'page-path', currentLabel));
    head.appendChild(left);
    head.appendChild(homeTitle('div'));
    var list = el('div', 'mobile-content');
    list.appendChild(menuLists());
    bar.appendChild(head);
    bar.appendChild(list);

    function setOpen(open) {
        bar.classList.toggle('expanded', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        setOpen(!bar.classList.contains('expanded'));
    });
    document.addEventListener('click', function (e) {
        if (!bar.contains(e.target)) setOpen(false);
    });
    document.addEventListener('touchstart', function (e) {
        if (!bar.contains(e.target)) setOpen(false);
    }, { passive: true });

    document.body.classList.add('has-site-nav');
    document.body.appendChild(sidebar);
    document.body.appendChild(bar);
})();
