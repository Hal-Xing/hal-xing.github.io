// Phone menu: built from the desktop sidebar (one menu to edit), opened by MENU in the bottom bar.
document.addEventListener('DOMContentLoaded', function () {
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileContent = document.querySelector('.mobile-content');
    const previewContent = document.getElementById('preview-content');
    if (!menuToggle || !mobileMenu || !mobileContent) return;

    // Copy the sidebar's labels and lists into the phone menu
    document.querySelectorAll('.sidebar .category, .sidebar .menu').forEach(el => {
        mobileContent.appendChild(el.cloneNode(true));
    });

    function setOpen(open) {
        mobileMenu.classList.toggle('expanded', open);
        mobileContent.style.display = open ? 'block' : 'none';
        menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    const closeMenu = () => setOpen(false);

    menuToggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(!mobileMenu.classList.contains('expanded'));
    });

    // Close after choosing a page, and on any tap or scroll outside the menu
    window.addEventListener('hashchange', closeMenu);
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.mobile-menu')) closeMenu();
    });
    window.addEventListener('scroll', closeMenu, { passive: true });

    // Taps and scrolls inside the framed page close the menu too (same site, so the frame can be listened to)
    if (previewContent) {
        previewContent.addEventListener('load', function (e) {
            if (e.target.tagName !== 'IFRAME') return;
            try {
                const win = e.target.contentWindow;
                ['touchstart', 'click', 'scroll'].forEach(type =>
                    win.addEventListener(type, closeMenu, { passive: true, capture: true }));
            } catch (err) { /* page from another site */ }
        }, true);
    }
});
