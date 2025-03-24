// Script for header/navbar

const hamburger = document.querySelector(".header__hamburger");
const navbar = document.querySelector(".header__navbar");
const overlay = document.querySelector(".navbar__overlay");

// Toggle hamburger menu
hamburger.addEventListener("click", function (e) {
    e.preventDefault();
    navbar.classList.toggle("active");
    overlay.classList.add("active");
    // Toggle body scroll lock
    // document.body.style.overflow = navbar.classList.contains('active') ? 'hidden' : '';
    document.body.style.overflow = "hidden";

})

// Close menu
document.querySelector(".navbar__close").addEventListener("click", function() {
    navbar.classList.remove("active");
    document.querySelector(".navbar__overlay").classList.remove("active");
    document.body.style.overflow = "";
  });

  // Close when clicking overlay
overlay.addEventListener("click", function() {
    navbar.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  });


// Make header scroll-activated
let lastScroll = 0;

window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset;
    const header = document.querySelector(".header")
    const navbar = document.querySelector('.header__navbar');

    // Skip if menu is open
    if (navbar.classList.contains('active')) return;

    if (currentScroll <= 0) {
        // If you scroll up to the top, remove class
        header.classList.remove("header--hidden");
        return;
    }

    if (currentScroll > lastScroll && !header.classList.contains("header--hidden")) {
        // Add class when scrolling down
        header.classList.add("header--hidden");
    } else if (currentScroll <= lastScroll && header.classList.contains("header--hidden")) {
        header.classList.remove("header--hidden");
    }

    lastScroll = currentScroll;
})