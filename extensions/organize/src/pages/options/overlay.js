(() => {
  function removeNavElements() {
    try {
      const navTabBtn = document.querySelector('.tabs .tab-btn[data-tab="nav"]');
      if (navTabBtn) navTabBtn.remove();
      const navSection = document.getElementById('nav');
      if (navSection) navSection.remove();
      const activeBtn = document.querySelector('.tabs .tab-btn.active');
      if (!activeBtn) {
        const organizeBtn = document.querySelector('.tabs .tab-btn[data-tab="organize"]');
        if (organizeBtn) organizeBtn.classList.add('active');
      }
      const activeContent = document.querySelector('.tab-content.active');
      if (!activeContent) {
        const organizeContent = document.getElementById('organize');
        if (organizeContent) organizeContent.classList.add('active');
      }
    } catch (e) {}
  }
  function patchOptionsManager() {
    try {
      if (typeof optionsManager !== 'undefined' && optionsManager) {
        optionsManager.updateWidgetConfig = function() {};
      }
    } catch (e) {}
  }
  function hideHelpQuickSearchToggle() {
    try {
      const toggle = document.getElementById('quickSearchShortcutEnabled');
      if (toggle) {
        const card = toggle.closest('.info-card');
        if (card) {
          card.remove();
        } else {
          const row = toggle.closest('.setting-item');
          if (row) row.style.display = 'none';
        }
      }
    } catch (e) {}
  }
  document.addEventListener('DOMContentLoaded', () => {
    removeNavElements();
    patchOptionsManager();
    hideHelpQuickSearchToggle();
  });
})();
