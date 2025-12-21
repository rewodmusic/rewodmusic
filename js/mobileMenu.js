(() => {
  const burger = document.getElementById("mBurger");
  const menu = document.getElementById("mMenu");

  if (!burger || !menu) return;

  function openMenu() {
    menu.classList.add("is-open");
    burger.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
  }

  function closeMenu() {
    menu.classList.remove("is-open");
    burger.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  }

  function toggleMenu() {
    const isOpen = menu.classList.contains("is-open");
    isOpen ? closeMenu() : openMenu();
  }

  burger.addEventListener("click", toggleMenu);

  // ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Ha a menü hátterére kattint (nem a panelre), zárjon:
  menu.addEventListener("click", (e) => {
    if (e.target === menu) closeMenu();
  });
})();