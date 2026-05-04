(function () {
  try {
    var t = localStorage.getItem("dkb-theme") || "dark";
    document.documentElement.dataset.theme = t;
  } catch (e) {
    document.documentElement.dataset.theme = "dark";
  }
})();
