export function initScrollHeader() {
  let lastScroll = 0;
  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset;
    const header = document.getElementById("header-background");
    const navbar = document.querySelector(".header__navbar");

    if (header && navbar) {
      // Skip if menu is open
      if (navbar.classList.contains("active")) return;

      if (currentScroll <= 0) {
        // If you scroll up to the top, remove class
        header.classList.remove("header--hidden");
        return;
      }

      if (
        currentScroll > lastScroll &&
        !header.classList.contains("header--hidden")
      ) {
        // Add class when scrolling down
        header.classList.add("header--hidden");
      } else if (
        currentScroll <= lastScroll &&
        header.classList.contains("header--hidden")
      ) {
        header.classList.remove("header--hidden");
      }

      lastScroll = currentScroll;
    }
  });
}

export function initMobileMenu() {
  const hamburger = document.querySelector(".header__hamburger");
  const navbar = document.querySelector(".header__navbar");
  const overlay = document.querySelector(".header__navbar-overlay");

  if (hamburger) {
    hamburger.addEventListener("click", function (e) {
      e.preventDefault();
      navbar.classList.toggle("active");
      overlay.classList.add("active");
      // Toggle body scroll lock
      document.body.style.overflow = "hidden";
    });
  }

  // Close mobile menu
  if (document.querySelector(".header__navbar-close")) {
    document
      .querySelector(".header__navbar-close")
      .addEventListener("click", function () {
        navbar.classList.remove("active");
        document
          .querySelector(".header__navbar-overlay")
          .classList.remove("active");
        document.body.style.overflow = "";
      });
  }

  // Close when clicking overlay

  if (overlay) {
    overlay.addEventListener("click", function () {
      navbar.classList.remove("active");
      overlay.classList.remove("active");
      document.body.style.overflow = "";
    });
  }
}

export function initSearchModal() {
  // Get elements
  const searchIcon = document.querySelector(".header__icon--search");
  const searchModal = document.querySelector(".header__search-modal");
  const searchClose = document.querySelector(".header__search-close");

  // Toggle modal
  if (searchIcon) {
    searchIcon.addEventListener("click", () => {
      searchModal.classList.add("header__search-modal--active");
      document.querySelector(".header__search-input").focus();
      document.body.style.overflow = "hidden";
    });
  }
  // Close modal
  if (searchClose) {
    searchClose.addEventListener("click", () => {
      searchModal.classList.remove("header__search-modal--active");
    });
  }

  // Close when clicking outside
  if (searchModal) {
    searchModal.addEventListener("click", (e) => {
      if (e.target === searchModal) {
        searchModal.classList.remove("header__search-modal--active");
      }
    });
  }
}

export function initAdminMenu() {
  const sidebarToggle = document.getElementById("admin-sidebar-toggle");
  const overlay = document.getElementById("admin-overlay");

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", function () {
      document.body.classList.toggle("admin-sidebar-open");
    });
  }

  if (overlay) {
    overlay.addEventListener("click", function () {
      document.body.classList.remove("admin-sidebar-open");
    });
  }
}
