// js/reveal.js
(() => {
  const body = document.body;
  if (!body.classList.contains("page-home")) return;



  // targetek
  const intro = document.querySelector(".intro");
  const releases = document.querySelector(".releases");
  const playlists = document.querySelector(".playlists");

  // helper: observer külön offsettel
  function makeObserver(rootMargin, threshold = 0.01) {
    return new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        obs.unobserve(entry.target); // egyszer fusson
      });
    }, { root: null, rootMargin, threshold });
  }

  // ✅ gyors: intro induljon “korán”
  const obsIntro = makeObserver("0px 0px -25% 0px");
  // ✅ releases: induljon normálisan (kicsit késleltetve)
  const obsReleases = makeObserver("0px 0px -15% 0px");
  // ✅ playlists: induljon sokkal később (csak amikor lejebb görgetsz)
  const obsPlaylists = makeObserver("0px 0px -10% 0px");

  // alapból legyenek “kifade-elve”, aztán is-in adja vissza
  [intro, releases, playlists].forEach(el => {
    if (!el) return;
    // ha valamiért JS előtt már villanna, ezt is tehetjük:
    // el.classList.remove("is-in");
  });

  if (intro) obsIntro.observe(intro);
  if (releases) obsReleases.observe(releases);
  if (playlists) obsPlaylists.observe(playlists);
})();