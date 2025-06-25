import "../scss/styles.scss";
import {
  initScrollHeader,
  initMobileMenu,
  initSearchModal,
  initAdminMenu,
} from "./modules/navbar.js";
import { initFormConfirmations } from "./modules/formConfirmation.js";
import { initProductImageSwitcher } from "./modules/productImages.js";
import { initProductSort } from "./modules/productSort.js";
import { initQuantitySelector } from "./modules/productQuantity.js";
import {
  initCheckoutAddress,
  initShowAddressSummary,
} from "./modules/checkoutAddress.js";
import { initOrderSubmission } from "./modules/orderSubmission.js";
import { initProductsFilter } from "./modules/productsFilter.js";
import { initProductInfoTabs } from "./modules/productInfoTabs.js";
import { initSizeSelector } from "./modules/sizeSelector.js";
import { initFlashMessages } from "./modules/flashMessages.js";
import { initShippingMethods } from "./modules/shippingMethods.js";
import { initCartProductBreakdown } from "./modules/cartProductBreakdown.js";
import { initPasswordVisibility } from "./modules/passwordVisibilityToggle.js";
import { initFormValidations } from "./modules/validation/index.js";

// Initialize all navbar functionality
function initApp() {
  try {
    // Navbar
    initScrollHeader();
    initMobileMenu();
    initSearchModal();
    initAdminMenu();

    // Form confirmations
    initFormConfirmations();

    // Product page image switcher
    initProductImageSwitcher();

    // Product sort by age/price
    initProductSort();

    // Quantity selector logic
    initQuantitySelector();

    // Checkout address selection script
    initCheckoutAddress();

    // Show address summary on checkout page
    initShowAddressSummary();

    // Order submission script, take values from address selection on page and pass them to form
    initOrderSubmission();

    // Script for products price filter and slider
    initProductsFilter();

    // Product page products-tab
    initProductInfoTabs();

    // Size selector
    initSizeSelector();

    // Flash Messages
    initFlashMessages();

    // Shipping methods script
    initShippingMethods();

    // Cart collapsible product breakdown
    initCartProductBreakdown();

    // Password visibility toggle
    initPasswordVisibility();

    // Validation
    initFormValidations();
  } catch (error) {
    console.error("JS initialization error:", error);
  }
}

document.addEventListener("DOMContentLoaded", initApp);
