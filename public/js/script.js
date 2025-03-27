// Script for mobile header

const hamburger = document.querySelector(".header__hamburger");
const navbar = document.querySelector(".header__navbar");
const overlay = document.querySelector(".header__navbar-overlay");
let lastScroll = 0;

// Make header scroll-activated
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

// Toggle mobile menu and overlay
hamburger.addEventListener("click", function (e) {
    e.preventDefault();
    navbar.classList.toggle("active");
    overlay.classList.add("active");
    // Toggle body scroll lock
    // document.body.style.overflow = navbar.classList.contains('active') ? 'hidden' : '';
    document.body.style.overflow = "hidden";

})

// Close mobile menu
document.querySelector(".header__navbar-close").addEventListener("click", function() {
    navbar.classList.remove("active");
    document.querySelector(".header__navbar-overlay").classList.remove("active");
    document.body.style.overflow = "";
  });

  // Close when clicking overlay
overlay.addEventListener("click", function() {
    navbar.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  });




// Search icon modal
// Get elements
const searchIcon = document.querySelector('.header__icon--search');
const searchModal = document.querySelector('.header__search-modal');
const searchClose = document.querySelector('.header__search-close');

// Toggle modal
searchIcon.addEventListener('click', () => {
  searchModal.classList.add('header__search-modal--active');
  document.querySelector('.header__search-input').focus();
  document.body.style.overflow = "hidden";
});

// Close modal
searchClose.addEventListener('click', () => {
  searchModal.classList.remove('header__search-modal--active');
});

// Close when clicking outside
searchModal.addEventListener('click', (e) => {
  if (e.target === searchModal) {
    searchModal.classList.remove('header__search-modal--active');
  }
});

// Axios call for address delete
async function deleteAddress(event, id) {
  event.preventDefault(); // Critical - prevents page jump
  
  if (!confirm('Are you sure you want to delete this address?')) {
    return false;
  }

  try {
    const response = await axios.post(`/address/shipping-addresses/delete/${id}`);
    
    if (response.status === 200) {
      window.location.reload();
    }
  } catch (error) {
    console.error('Delete failed:', error);
    alert('Delete failed: ' + 
      (error.response?.data?.message || 
       error.message || 
       'Server error'));
  }
  
  return false;
}

// Image switching for product page, swap main image src with clicked image src
document.addEventListener('DOMContentLoaded', () => {
  const mainImage = document.querySelector('.product-main__image img');
  const thumbnails = document.querySelectorAll('.product-main__slideshow img');
  
  thumbnails.forEach(thumbnail => {
    thumbnail.addEventListener('click', () => {
      mainImage.src = thumbnail.src;
    });
  });
});


// Script for sorting products by price or age

function productSort() {
  const sortSelect = document.getElementById("sort-select");
  const [sort, order] = sortSelect.value.split("-");
  // Get current URL
  const url = new URL(window.location.href);

  // Add search params to current URL based on selected value
  if (sort) {
    url.searchParams.set("sort", sort);
    url.searchParams.set("order", order);
  } else { // If default is selected, remove search params
    url.searchParams.delete("sort");
    url.searchParams.delete("order");
  }

  // Convert url back to string and pass it back to trigger re-render of page
  window.location.href = url.toString();
}

// Product quantity button
const minusBtn = document.querySelector(".quantity-btn.minus");
const plusBtn = document.querySelector(".quantity-btn.plus");
const quantityInput = document.querySelector(".quantity-input");
const max = parseInt(quantityInput.max) || 10;

// Minus button
minusBtn.addEventListener('click', () => {
  let value = parseInt(quantityInput.value);
  if (value > 1) {
    quantityInput.value = value - 1;
  }
  toggleButtons();
});

// Plus button
plusBtn.addEventListener('click', () => {
  let value = parseInt(quantityInput.value);
  if (value < max) {
    quantityInput.value = value + 1;
  }
  toggleButtons();
});

// Validate input
quantityInput.addEventListener('change', () => {
  if (isNaN(value) || value < 1) {
    quantityInput.value = 1;
  }
  if (value > max) {
    quantityInput.value = max;
  }
  toggleButtons();
})

// Disable buttons for min and max values
function toggleButtons() {
  minusBtn.disabled = parseInt(quantityInput.value) <= 1;
  plusBtn.disabled = parseInt(quantityInput.value) >= max;
}