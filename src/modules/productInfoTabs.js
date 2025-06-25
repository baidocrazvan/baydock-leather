// Product page products-tab
export function initProductInfoTabs() {
  const tabs = document.querySelectorAll(".tabs li");
  if (tabs && tabs.length > 0) {
    tabs.forEach((tab) => {
      tab.addEventListener("click", function () {
        // Remove all selections
        document
          .querySelectorAll(".tabs li")
          .forEach((t) => t.classList.remove("selected"));
        document
          .querySelectorAll(".panel")
          .forEach((p) => p.classList.remove("active"));

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
}
