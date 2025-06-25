export function initProductSort() {
  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      const [sort, order] = this.value.split("-");
      // Get current URL
      const url = new URL(window.location.href);

      // Add search params to current URL based on selected value
      if (sort) {
        url.searchParams.set("sort", sort);
        url.searchParams.set("order", order);
      } else {
        // If default is selected, remove search params
        url.searchParams.delete("sort");
        url.searchParams.delete("order");
      }

      // Convert url back to string and pass it back to trigger re-render of page
      window.location.href = url.toString();
    });
  }
}
