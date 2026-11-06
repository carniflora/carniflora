import { dom } from "./dom.js";

let navButtons = null;
let tabs = null;

// Queries the nav elements and wires the click listeners. Must be called
// before the first setActiveTab call.
export function mountTabs() {
  const { $ } = dom();
  navButtons = document.querySelectorAll(".nav-btn[data-tab]");
  tabs = {
    plants: $("plantsTab"),
    upgrades: $("upgradesTab"),
    battle: $("battleTab"),
  };
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedTab = button.dataset.tab;
      setActiveTab(selectedTab);
    });
  });
}

// =====================================================
// function that changes tabs.
// =====================================================

export function setActiveTab(tabName) {
  // Remove active style
  // from every navigation button.
  navButtons.forEach((button) => {
    button.classList.remove("active");
  });

  // Hide every tab.
  Object.values(tabs).forEach((tab) => {
    tab.classList.remove("active");
  });

  // Find navigation button
  // belonging to this tab.
  const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);

  // Highlight selected button.
  if (selectedButton) {
    selectedButton.classList.add("active");
  }

  // Show selected tab.
  if (tabs[tabName]) {
    tabs[tabName].classList.add("active");
  }
}
