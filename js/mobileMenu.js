(() => {
  const burger = document.getElementById("mBurger");
  const menu = document.getElementById("mMenu");

  if (!burger || !menu) return;

  function lockScroll() {
    document.documentElement.classList.add("menu-open");
    document.body.classList.add("menu-open");
  }

  function unlockScroll() {
    document.documentElement.classList.remove("menu-open");
    document.body.classList.remove("menu-open");
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
    if (e) e.preventDefault();

    if (menu.classList.contains("is-open")) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  burger.addEventListener("click", toggleMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
    }
  });

  menu.addEventListener("click", (e) => {
    if (e.target === menu) {
      closeMenu();
    }
  });
})();