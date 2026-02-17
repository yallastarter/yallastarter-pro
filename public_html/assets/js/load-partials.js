/**
 * Load header/footer partials into elements with data-partial attribute.
 * Usage: <header class="header" data-partial="header" data-lang="en">...</header>
 * Or: <div data-partial="header" data-lang="en"></div>
 * Requires mobile-menu.js to be loaded after for mobile menu behavior.
 */
(function () {
    function loadPartial(container) {
        var partial = container.getAttribute('data-partial');
        var lang = (container.getAttribute('data-lang') || 'en').toLowerCase();
        if (!partial) return;
        var path = 'partials/' + partial + '-' + (lang === 'ar' ? 'ar' : 'en') + '.html';
        var xhr = new XMLHttpRequest();
        xhr.open('GET', path, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    container.innerHTML = xhr.responseText;
                }
            }
        };
        xhr.send();
    }
    function init() {
        var containers = document.querySelectorAll('[data-partial]');
        for (var i = 0; i < containers.length; i++) {
            loadPartial(containers[i]);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
