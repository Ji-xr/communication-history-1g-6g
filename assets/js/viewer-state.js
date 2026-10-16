/* Small shared state controller for the 3D gallery and its 2D fallback. */
(function (root) {
  const viewerState = { mode: '2d', status: 'ready', error: null };
  let pendingInitialization = null;

  function set(mode, status, error = null) {
    viewerState.mode = mode;
    viewerState.status = status;
    viewerState.error = error ? String(error.message || error) : null;
    return viewerState;
  }

  function initialize(start) {
    if (pendingInitialization) return pendingInitialization;
    set('3d', 'loading');
    pendingInitialization = Promise.resolve()
      .then(start)
      .then(value => {
        set('3d', 'ready');
        return { ok: true, value, reused: false };
      })
      .catch(error => {
        set('fallback', 'failed', error);
        return { ok: false, error, reused: false };
      })
      .finally(() => { pendingInitialization = null; });
    return pendingInitialization;
  }

  function continueExploring(on3D, on2D) {
    if (viewerState.mode === '3d' && viewerState.status === 'ready') return on3D?.();
    return on2D?.(viewerState);
  }

  root.viewerState = viewerState;
  root.CommsArchiveViewerFlow = { state: viewerState, set, initialize, continueExploring };
})(window);
