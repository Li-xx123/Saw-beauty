/* 风景光影 — Tailwind Play CDN config (shared across pages)
   Loads the brand tokens as Tailwind utilities so markup like
   bg-lp-primary / text-lp-fg-muted / rounded-lp-md works everywhere. */
(function () {
  if (typeof window === 'undefined' || !window.tailwind) return;
  window.tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          'lp-primary': 'var(--lp-primary)',
          'lp-primary-hover': 'var(--lp-primary-hover)',
          'lp-primary-fg': 'var(--lp-primary-foreground)',
          'lp-primary-light': 'var(--lp-primary-light)',
          'lp-primary-tint': 'var(--lp-primary-tint)',
          'lp-bg': 'var(--lp-background)',
          'lp-surface': 'var(--lp-surface)',
          'lp-surface-2': 'var(--lp-surface-2)',
          'lp-surface-3': 'var(--lp-surface-3)',
          'lp-fg': 'var(--lp-foreground)',
          'lp-fg-muted': 'var(--lp-foreground-muted)',
          'lp-fg-subtle': 'var(--lp-foreground-subtle)',
          'lp-border': 'var(--lp-border)',
          'lp-border-strong': 'var(--lp-border-strong)',
          'lp-card': 'var(--lp-card)',
          'lp-muted': 'var(--lp-muted)',
          'lp-muted-fg': 'var(--lp-muted-foreground)',
          'lp-ring': 'var(--lp-ring)'
        },
        borderRadius: {
          'lp-sm': 'var(--lp-radius-small)',
          'lp-md': 'var(--lp-radius-medium)',
          'lp-lg': 'var(--lp-radius-large)',
          'lp-full': 'var(--lp-radius-full)'
        },
        boxShadow: {
          'lp-sm': 'var(--lp-shadow-sm)',
          'lp-md': 'var(--lp-shadow-md)',
          'lp-float': 'var(--lp-shadow-float)',
          'lp-overlay': 'var(--lp-shadow-overlay)'
        },
        fontFamily: {
          'lp-sans': 'var(--lp-font-sans)',
          'lp-mono': 'var(--lp-font-mono)'
        },
        maxWidth: {
          'lp-container': '1400px'
        }
      }
    }
  };
})();
