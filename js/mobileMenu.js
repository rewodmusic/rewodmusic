(() => {
  const burger = document.getElementById("mBurger");
  const menu = document.getElementById("mMenu");
  if (!burger || !menu) return;

  let scrollY = 0;

  function lockScroll() {
    scrollY = window.scrollY || 0;

    document.body.classList.add("menu-open");

    // fontos: top + width fix, hogy ne legyen felül “rés”
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
  }

  function unlockScroll() {
    document.body.classList.remove("menu-open");

    document.body.style.top = "";
    document.body.style.width = "";

    window.scrollTo(0, scrollY);
  }

  function openMenu() {
    menu.classList.add("is-open");
    burger.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true");
    lockScroll();
  }

  function closeMenu() {
    menu.classList.remove("is-open");
    burger.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false");
    unlockScroll();
  }

  function toggleMenu(e) {
    // extra safety, ha a burger mégis link/szokatlan elem lenne
    if (e) e.preventDefault();
    menu.classList.contains("is-open") ? closeMenu() : openMenu();
  }

  burger.addEventListener("click", toggleMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  menu.addEventListener("click", (e) => {
    if (e.target === menu) closeMenu();
  });
})();