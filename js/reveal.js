// js/reveal.js
(() => {
  const body = document.body;
  if (!body.classList.contains("page-home")) return;

  const intro = document.querySelector(".intro");
  const releases = document.querySelector(".releases");
  const playlists = document.querySelector(".playlists");

  function makeObserver(rootMargin, threshold = 0.01) {
    return new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        obs.unobserve(entry.target);
      });
    }, { root: null, rootMargin, threshold });
  }

  // ✅ INTRO: AZONNAL LÁTSZÓDJON
  if (intro) intro.classList.add("is-in");

  // ✅ a többire marad a reveal scrollra
  const obsReleases = makeObserver("0px 0px -15% 0px");
  const obsPlaylists = makeObserver("0px 0px -10% 0px");

  if (releases) obsReleases.observe(releases);
  if (playlists) obsPlaylists.observe(playlists);
})();