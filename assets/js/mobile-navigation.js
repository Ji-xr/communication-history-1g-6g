/* Accessible mobile navigation toggle; desktop navigation remains unchanged. */
(function (root) {
  'use strict';
  if (!root?.document) return;
  const document = root.document;
  const toggle = document.getElementById('mobileNavToggle');
  const navigation = document.getElementById('primaryNavigation');
  if (!toggle || !navigation) return;

  function isMobile() {
    return root.matchMedia?.('(max-width: 767px)').matches
      ?? (root.innerWidth || document.documentElement?.clientWidth || 1024) <= 767;
  }
  function closeMenu({ restoreFocus = false } = {}) {
    navigation.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '打开主导航');
    if (restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => {
    if (!isMobile()) return;
    const opening = !navigation.classList.contains('is-open');
    navigation.classList.toggle('is-open', opening);
    toggle.setAttribute('aria-expanded', String(opening));
    toggle.setAttribute('aria-label', opening ? '关闭主导航' : '打开主导航');
  });
  navigation.addEventListener('click', event => {
    if (isMobile() && event.target.closest('button,a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navigation.classList.contains('is-open')) closeMenu({ restoreFocus: true });
  });
  const media = root.matchMedia?.('(max-width: 767px)');
  media?.addEventListener?.('change', event => { if (!event.matches) closeMenu(); });
  closeMenu();
})(typeof window !== 'undefined' ? window : null);
