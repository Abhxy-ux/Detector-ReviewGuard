/* ── Shared UI helpers ── */

function renderNav(activePage) {
  const pages = [
    { href: '../index.html', label: 'Home',         id: 'home' },
    { href: '../pages/detector.html', label: 'Detector', id: 'detector' },
    { href: '../pages/how-it-works.html', label: 'How It Works', id: 'howitworks' },
  ];

  // Detect if we're at root level
  const isRoot = !window.location.pathname.includes('/pages/');
  const base   = isRoot ? '' : '../';

  document.getElementById('nav-placeholder').innerHTML = `
    <div class="grid-bg"></div>
    <div class="glow-top"></div>
    <nav>
      <a class="nav-logo" href="${base}index.html">
        <div class="nav-logo-icon">🔍</div>
        ReviewGuard
      </a>
      <div class="nav-links" id="navLinks">
        <a class="nav-link ${activePage==='home'?'active':''}"         href="${base}index.html">Home</a>
        <a class="nav-link ${activePage==='detector'?'active':''}"     href="${base}pages/detector.html">Detector</a>
        <a class="nav-link ${activePage==='howitworks'?'active':''}"   href="${base}pages/how-it-works.html">How It Works</a>
        <a class="nav-cta" href="${base}pages/detector.html">Try It Free →</a>
      </div>
      <button class="hamburger" onclick="toggleMenu()" aria-label="Menu">☰</button>
    </nav>`;
}

function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}

function renderFooter() {
  const isRoot = !window.location.pathname.includes('/pages/');
  const base   = isRoot ? '' : '../';
  const year   = new Date().getFullYear();

  document.getElementById('footer-placeholder').innerHTML = `
    <footer>
      <div class="footer-logo">
        <div class="footer-logo-icon">🔍</div>
        ReviewGuard
      </div>
      <div class="footer-links">
        <a class="footer-link" href="${base}index.html">Home</a>
        <a class="footer-link" href="${base}pages/detector.html">Detector</a>
        <a class="footer-link" href="${base}pages/how-it-works.html">How It Works</a>
      </div>
      <div class="footer-copy">© ${year} ReviewGuard · College Project · Built with ❤️</div>
    </footer>`;
}
