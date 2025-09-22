document.addEventListener("DOMContentLoaded", () => {
  const viewer = document.getElementById("viewer");
  // страховка: атрибуты для AR
  viewer.setAttribute("ar-placement", "floor");
  viewer.setAttribute("ar-scale", "fixed");
});
