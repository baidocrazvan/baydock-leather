// Script for mobile header

const hamburger = document.querySelector(".header__hamburger");
const navbar = document.querySelector(".header__navbar");
const overlay = document.querySelector(".header__navbar-overlay");
let lastScroll = 0;

// Make header scroll-activated
window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset;
    const header = document.getElementById("header-background")
    const navbar = document.querySelector(".header__navbar");

    if (header && navbar) {
    // Skip if menu is open
    if (navbar.classList.contains("active")) return;

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
    }
})

// Toggle mobile menu and overlay
if (hamburger) {
  hamburger.addEventListener("click", function (e) {
      e.preventDefault();
      navbar.classList.toggle("active");
      overlay.classList.add("active");
      // Toggle body scroll lock
      // document.body.style.overflow = navbar.classList.contains('active') ? 'hidden' : '';
      document.body.style.overflow = "hidden";

  })
}

// Close mobile menu
if (document.querySelector(".header__navbar-close")) {
  document.querySelector(".header__navbar-close").addEventListener("click", function() {
      navbar.classList.remove("active");
      document.querySelector(".header__navbar-overlay").classList.remove("active");
      document.body.style.overflow = "";
    });
}

// Close when clicking overlay

if (overlay) {
  overlay.addEventListener("click", function() {
    navbar.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  });
}


// Search icon modal
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

// Confirmation for forms and links
document.addEventListener('DOMContentLoaded', () => {
  // Handle forms
  document.querySelectorAll('form[data-confirm]').forEach(form => {
    form.addEventListener('submit', (e) => { // Listen for submit event
      if (!confirm(form.dataset.confirm)) {
        e.preventDefault(); 
      }
    });
  });

  // Handle confirmable links
  document.querySelectorAll('a[data-confirm]').forEach(link => {
    link.addEventListener('click', (e) => {
      if (!confirm(link.dataset.confirm)) {
        e.preventDefault();
      }
    });
  });
});

// Image switching for product page, swap main image src with clicked image src
document.addEventListener("DOMContentLoaded", () => {
  const mainImage = document.querySelector(".product-main__image img");
  const thumbnails = document.querySelectorAll(".product-main__slideshow img");
  
  thumbnails.forEach(thumbnail => {
    thumbnail.addEventListener("click", () => {
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

// Quantity selector logic
document.addEventListener("DOMContentLoaded", () => {
  // Handle both product page and cart page selectors
  const quantitySelectors = document.querySelectorAll(`
    .item-update .quantity-selector,
    #size-select .quantity-selector
  `);

  quantitySelectors.forEach(selector => {
    const minusBtn = selector.querySelector(".quantity-btn.minus");
    const plusBtn = selector.querySelector(".quantity-btn.plus");
    const quantityInput = selector.querySelector(".quantity-input");
    const form = selector.closest('form');
    const updateIconBtn = form?.querySelector(".update-icon-btn");

    if (!minusBtn || !plusBtn || !quantityInput) return;

    const max = parseInt(quantityInput.max) || 10;
    const initialValue = parseInt(quantityInput.value);
    
    // Store initial value
    quantityInput.dataset.initialValue = initialValue;

    function checkForChanges() {
      const currentValue = parseInt(quantityInput.value);
      if (updateIconBtn) {
        updateIconBtn.hidden = currentValue === initialValue;
      }
      toggleButtons();
    }

    minusBtn.addEventListener("click", () => {
      let value = parseInt(quantityInput.value);
      if (value > 1) {
        quantityInput.value = value - 1;
        checkForChanges();
      }
    });

    plusBtn.addEventListener("click", () => {
      let value = parseInt(quantityInput.value);
      if (value < max) {
        quantityInput.value = value + 1;
        checkForChanges();
      }
    });

    quantityInput.addEventListener("change", () => {
      let value = parseInt(quantityInput.value);
      if (isNaN(value) || value < 1) value = 1;
      if (value > max) value = max;
      quantityInput.value = value;
      checkForChanges();
    });

    function toggleButtons() {
      minusBtn.disabled = parseInt(quantityInput.value) <= 1;
      plusBtn.disabled = parseInt(quantityInput.value) >= max;
    }

    toggleButtons();
  });
});


// Checkout address selection script

document.addEventListener("DOMContentLoaded", function() {
  const shippingSelect = document.getElementById("shippingAddress");
  const billingSelect = document.getElementById("billingAddress");
  const updateBtn = document.getElementById("updateDefaultBtn");
  
  function checkForChange() {
    // Access the <option> selected value and check if the isShipping/isBilling has changed to false
    const shippingChanged = shippingSelect.options[shippingSelect.selectedIndex].dataset.isShipping === "false";
    const billingChanged = billingSelect.options[billingSelect.selectedIndex].dataset.isBilling === "false";
    
    // Show update button if defaults changed
    updateBtn.style.display = (shippingChanged || billingChanged) ? "block" : "none";
  }
  if (shippingSelect && billingSelect) {
    shippingSelect.addEventListener("change", checkForChange);
    billingSelect.addEventListener("change", checkForChange);
  }
  

});


// Order submission script, take values from address selection on page and pass them to form

document.addEventListener("DOMContentLoaded", function() {
    const orderForm = document.querySelector(".order-submission");
    if (orderForm) {
      orderForm.addEventListener("submit", function(e) {
      document.getElementById("hiddenShippingAddressId").value = document.getElementById("shippingAddress").value;
  
      const billingSelect = document.getElementById("billingAddress");
      document.getElementById("hiddenBillingAddressId").value = 
      billingSelect.value || document.getElementById("shippingAddress").value;
    }
  )};    
});

// Script for products price filter and slider
document.addEventListener("DOMContentLoaded", function() {
  const filterForm = document.querySelector(".price-filter");
  const minThumb = document.querySelector(".min-thumb");
  const maxThumb = document.querySelector(".max-thumb");
  const track = document.querySelector(".slider-track");
  const minPriceDisplay = document.querySelector(".min-price");
  const maxPriceDisplay = document.querySelector(".max-price");
  const minPriceInput = document.querySelector('input[name="min_price"]');
  const maxPriceInput = document.querySelector('input[name="max_price"]');

  if (filterForm) {
    function updateSlider() {
      const minVal = parseInt(minThumb.value);
      const maxVal = parseInt(maxThumb.value);
      
      // Prevent sliders crossing
      if (minVal > maxVal - 5) {
        minThumb.value = maxVal - 5;
        return;
      }
      
      // Update track position
      track.style.left = `${(minVal / 500) * 100}%`;
      track.style.right = `${100 - (maxVal / 500) * 100}%`;
      
      // Update price displays
      minPriceDisplay.textContent = `€${minVal}`;
      maxPriceDisplay.textContent = `€${maxVal}`;
      minPriceInput.value = minVal;
      maxPriceInput.value = maxVal;
    }

    if (minThumb && maxThumb) {
      minThumb.addEventListener("input", updateSlider);
      maxThumb.addEventListener("input", updateSlider);
    }
  
    
    // Initialize
    updateSlider();
  }
});

// Product page products-tab
document.addEventListener("DOMContentLoaded", function() {
  const tabs = document.querySelectorAll(".tabs li");
    if (tabs && tabs.length > 0) {
      tabs.forEach(tab => {
        tab.addEventListener("click", function() {
          // Remove all selections
          document.querySelectorAll(".tabs li").forEach(t => t.classList.remove("selected"));
          document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
          
          // Add selection to clicked tab
          this.classList.add("selected");
          
          // Activate corresponding panel
          const panelId = this.id.replace("tab-title-", "tab-");
          document.getElementById(panelId).classList.add("active");
        });
      });
      
      // Initialize first tab as active if none selected
      if (!document.querySelector(".tabs li.selected")) {
        tabs[0].classList.add("selected");
        document.querySelector(".panel").classList.add("active");
      }
    }
});

// Product page size selector for belts
if (document.getElementById("size-select")) {
  document.getElementById("size-select").addEventListener("submit", function(e) {
    const sizeSelect = document.getElementById("belt-size");
    if (!sizeSelect.value) {
      e.preventDefault();
      sizeSelect.setCustomValidity("Please select a size");
      sizeSelect.reportValidity();
    }
  });
}

// Checkout page script for showing address summary
document.addEventListener("DOMContentLoaded", function() {
  // Update address summary
  function updateAddressSummary(selectElement, summaryElement) {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const addressData = JSON.parse(selectedOption.getAttribute("data-address"));
    
    summaryElement.innerHTML = `
      <div class="address-card">
        <p><strong>${addressData.first_name} ${addressData.last_name}</strong></p>
        <p>${addressData.address}</p>
        <p>${addressData.city}, ${addressData.county}</p>
        <p>${addressData.country}, ${addressData.postal_code}</p>
        <p>Phone: ${addressData.phone_number}</p>
      </div>
    `;
  }

  // Initialize and set up event listeners
  const shippingSelect = document.getElementById("shippingAddress");
  const billingSelect = document.getElementById("billingAddress");
  const shippingSummary = document.getElementById("shippingAddressSummary");
  const billingSummary = document.getElementById("billingAddressSummary");

  if (shippingSelect && shippingSummary) {
    updateAddressSummary(shippingSelect, shippingSummary);
    shippingSelect.addEventListener("change", () => updateAddressSummary(shippingSelect, shippingSummary));
  }

  if (billingSelect && billingSummary) {
    updateAddressSummary(billingSelect, billingSummary);
    billingSelect.addEventListener("change", () => updateAddressSummary(billingSelect, billingSummary));
  }
});

// Desktop view admin flash-error message script for closing
document.addEventListener("DOMContentLoaded", function() {
  // Close button functionality
  document.querySelectorAll(".admin-flash__close").forEach(button => {
    button.addEventListener("click", function() {
      const flash = this.closest(".admin-flash");
      flash.classList.add("hide");
      // Remove element after animation completes
      flash.addEventListener("animationend", () => flash.remove());
    });
  });

  // Auto-dismiss after 5 seconds
  document.querySelectorAll(".admin-flash").forEach(flash => {
    setTimeout(() => {
      flash.classList.add("hide");
      flash.addEventListener("animationend", () => flash.remove());
    }, 5000);
  });
});

// Cart notification  
document.addEventListener("DOMContentLoaded", () => {
  const notification = document.getElementById("cartNotification");
  const closeBtn = notification?.querySelector(".cart-notification__close");
  
  // Manual dismiss
  closeBtn?.addEventListener("click", () => {
    notification.classList.add("hide");
    setTimeout(() => notification.remove(), 300);
  });
  
  // Auto-dismiss
  if (notification) {
    setTimeout(() => {
      notification.classList.add("hide");
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
});

// Shipping methods script

document.addEventListener('DOMContentLoaded', function() {
  const shippingMethodRadios = document.querySelectorAll('input[name="shippingMethodId"]');
  const shippingCostEl = document.getElementById('shipping-cost');
  const orderTotalEl = document.getElementById('order-total');
  
  // Get data from window object
  const subtotal = parseFloat(window.cartSubtotal);
  const shippingMethods = window.shippingMethods || [];
  
  // Convert shipping methods array to lookup object
  const methodsData = {};
  shippingMethods.forEach(method => {
    methodsData[method.id] = method.base_price;
  });

  // Calculate and display initial shipping cost
  updateShippingCost();

  // Handle shipping method selection changes
  shippingMethodRadios.forEach(radio => {
    radio.addEventListener('change', updateShippingCost);
  });

  function updateShippingCost() {
    const selectedMethod = document.querySelector('input[name="shippingMethodId"]:checked');
    if (!selectedMethod || !methodsData[selectedMethod.value]) return;
    
    let shippingCost = 0;
    if (subtotal < 100) {
      shippingCost = parseFloat(methodsData[selectedMethod.value]);
    }

    const total = subtotal + shippingCost;

    // Update displayed prices
    shippingCostEl.textContent = subtotal >= 100 ? "FREE" : formatPrice(shippingCost);
    orderTotalEl.textContent = formatPrice(total);
    // Update hidden form field
    const hiddenShippingInput = document.getElementById('hiddenShippingMethodId');
    if (hiddenShippingInput) {
      hiddenShippingInput.value = selectedMethod.value;
    }
  }

  function formatPrice(amount) {
    return '€' + parseFloat(amount).toFixed(2);
  }
});

// Cart collapsible product breakdown
document.addEventListener("DOMContentLoaded", function() {
  // Product breakdown toggle functionality
  const breakdownToggle = document.querySelector(".breakdown-toggle-btn");
  const productBreakdown = document.querySelector(".product-breakdown");
  
  if (breakdownToggle && productBreakdown) {
    breakdownToggle.addEventListener("click", function() {
      // Toggle visibility
      const isExpanded = productBreakdown.style.display === "flex";
      productBreakdown.style.display = isExpanded ? "none" : "flex";
      
      // Update button text and icon
      breakdownToggle.classList.toggle("expanded");
      breakdownToggle.querySelector("span").textContent = 
        isExpanded ? "Show item details" : "Hide item details";
      
      // Animate the toggle
      if (!isExpanded) {
        productBreakdown.style.animation = "fadeIn 0.3s ease-out";
      }
    });
  }
});


// =====================
// FORM VALIDATION
// =====================

// Validate login form before submission


const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const addressForm = document.getElementById("addressForm");
const email = document.getElementById("email");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("cpassword");
const firstName = document.getElementById("firstName");
const lastName = document.getElementById("lastName");
const address = document.getElementById("address");
const city = document.getElementById("city");
const county = document.getElementById("county");
const phoneNumber = document.getElementById("phoneNumber");
const postalCode = document.getElementById("postalCode");

if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      if (!validateLoginInputs()) {
        e.preventDefault(); // Only prevent if validation fails
      }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", (e) => {
    if(!validateRegisterInputs()) {
      e.preventDefault();
    }
});
}

if (addressForm) {
  addressForm.addEventListener("submit", (e) => {
    if(!validateAddressInputs()) {
      e.preventDefault();
    }
  })
}

const setError = (element, message) => {
  const inputControl = element.parentElement;
  const errorDisplay = inputControl.querySelector(".error");

  errorDisplay.innerText = message;

  inputControl.classList.add("error");
  inputControl.classList.remove("success");
}

const setSuccess = element => {
  const inputControl = element.parentElement;
  const errorDisplay = inputControl.querySelector(".error");

  if (errorDisplay.textContent !== "") {
    errorDisplay.innerText = "";
    inputControl.classList.remove("error");
  }
}

const isValidEmail = email => {
  const re = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/
  return re.test(email)
}

const isValidPassword = password => {
  const re = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/
  return re.test(password);
}

const isValidName = name => {
  const re = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]{2,50}$/
  return re.test(name);
}

const isValidPhoneNumber = phoneNumber => {
  const re = /^\+40\d{1,10}$/
  return re.test(phoneNumber);
}

const isValidPostalCode = postalCode => {
  const re = /^\d{6}$/
  return re.test(postalCode)
}

const validateLoginInputs = () => {
  const emailValue = email.value.trim();
  const passwordValue = password.value.trim();
  let isValid = true;

  if (emailValue === "") {
      setError(email, "Email is required");
      isValid = false;
  } else if (!isValidEmail(emailValue)) {
    setError(email, "Email address is invalid");
    isValid = false;
  } else {
    setSuccess(email);
  }

  if (passwordValue === "") {
    setError(password, "Password is required");
    isValid = false;
  } else {
    setSuccess(password);
  }

  return isValid;
}

const validateRegisterInputs = () => {
  const emailValue = email.value;
  const passwordValue = password.value;
  const confirmPasswordValue = confirmPassword.value;
  const firstNameValue = firstName.value;
  const lastNameValue = lastName.value;
  let isValid = true;

  if (emailValue === "") {
    setError(email, "Email is required");
    isValid = false;
  } else if (!isValidEmail(emailValue)) {
    setError(email, "Email address is invalid");
    isValid = false;
  } else {
    setSuccess(email);
  }

  if (passwordValue === "") {
    setError(password, "Password is required");
    isValid = false;
  } else if (passwordValue.length < 8 ) {
    setError(password, "Password must be atleast 8 characters long");
    isValid = false;
  } else if (!isValidPassword(passwordValue)) {
    setError(password, "Password must contain an uppercase and a number");
    isValid = false;
  } else {
    setSuccess(password);
  }

  if (confirmPasswordValue === "") {
    console.log(confirmPasswordValue);
    setError(confirmPassword, "Confirmation password is required");
    isValid = false;
  }  else if (passwordValue !== confirmPasswordValue) {
    console.log(confirmPasswordValue);
    setError(confirmPassword, "Confirmation password does not match password");
    isValid = false;
  } else {
    setSuccess(confirmPassword);
  }

  if (firstNameValue === "") {
    setError(firstName, "First name is required");
    isValid = false;
  } else if (firstNameValue.length < 2) {
    setError(firstName, "First name needs to be at least 2 characters long.");
    isValid = false;
  } else if (!isValidName(firstNameValue)) {
    setError(firstName, "Names cannot contain numbers or symbols");
    isValid = false;
  } else {
    setSuccess(firstName);
  }

  if (lastNameValue === "") {
    setError(lastName, "Last name is required");
    isValid = false;
  } else if (lastNameValue.length < 2) {
    setError(lastName, "Last name needs to be at least 2 characters long.");
    isValid = false;
  } else if (!isValidName(lastNameValue)) {
    setError(firstName, "Names cannot contain numbers or symbols");
    isValid = false;
  } else {
    setSuccess(lastName);
  }

  return isValid;
}


const validateAddressInputs = () => {
  const firstNameValue = firstName.value.trim();
  const lastNameValue = lastName.value.trim();
  const addressValue = address.value.trim();
  const cityValue = city.value.trim();
  const countyValue = county.value.trim();
  const phoneNumberValue = phoneNumber.value.trim();
  const postalCodeValue = postalCode.value.trim();
  let isValid = true;

  if (firstNameValue === "") {
    setError(firstName, "First name is required");
    isValid = false;
  } else if (firstNameValue.length < 2) {
    setError(firstName, "First name needs to be at least 2 characters long.");
    isValid = false;
  } else if (!isValidName(firstNameValue)) {
    setError(firstName, "Names cannot contain numbers or symbols");
    isValid = false;
  } else {
    setSuccess(firstName);
  }

  if (lastNameValue === "") {
    setError(lastName, "Last name is required");
    isValid = false;
  } else if (lastNameValue.length < 2) {
    setError(lastName, "Last name needs to be at least 2 characters long.");
    isValid = false;
  } else if (!isValidName(lastNameValue)) {
    setError(lastName, "Names cannot contain numbers or symbols");
    isValid = false;
  } else {
    setSuccess(lastName);
  }

  if (addressValue === "") {
    setError(address, "Address is required");
    isValid = false;
  } else if (addressValue.length < 2) {
    setError(address, "Address needs to be longer than 2 characters");
    isValid = false;
  } else if (addressValue > 50) {
    setError(address, "Address cannot be longer than 50 characters");
    isValid = false;
  } else {
    setSuccess(address);
  }

  if (cityValue === "") {
    setError(city, "City name is required");
    isValid = false;
  } else if (cityValue.length < 2) {
    setError(city, "City name needs to be longer than 2 characters");
    isValid = false;
  } else if (cityValue.length > 32) {
    setError(city, "City name cannot exceed 32 characters");
    isValid = false;
  } else {
    setSuccess(city);
  }

  if (countyValue === "") {
    setError(county, "County name is required");
    isValid = false;
  } else if (countyValue.length < 2) {
    setError(county, "County name needs to be longer than 2 characters");
    isValid = false;
  } else if (countyValue.length > 32) {
    setError(county, "County name cannot exceed 32 characters");
    isValid = false;
  } else {
    setSuccess(county);
  }

  if (phoneNumberValue === "") {
    setError(phoneNumber, "Valid mobile phone number is required");
    isValid = false;
  } else if (!isValidPhoneNumber(phoneNumberValue)) {
    setError(phoneNumber, "Phone number must start with +40 and be a valid Romanian mobile phone number");
    isValid = false;
  } else {
    setSuccess(phoneNumber)
  }

  if (postalCodeValue === "") {
    setError(postalCode, "Postal code is required");
    isValid = false;
  } else if (!isValidPostalCode(postalCodeValue)) {
    setError(postalCode, "Valid 6-character postal code is required")
    isValid = false;
  } else {
    setSuccess(postalCode);
  }

  return isValid;
}
