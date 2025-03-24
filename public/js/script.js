const hamburger = document.querySelector(".header__hamburger");
const navbar = document.querySelector(".header__navbar")

hamburger.addEventListener("click", function () {
    console.log("I got clicked");
    navbar.classList.toggle('active');
})