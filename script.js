document.addEventListener("DOMContentLoaded", () => {
  const viewer = document.getElementById("viewer");
  const scale = document.getElementById("scale");
  const reset = document.getElementById("reset");
  const arPrompt = document.getElementById("ar-prompt");

  // Показать подсказку при готовности AR
  viewer.addEventListener("ar-status", (ev) => {
    // ev.detail.status: 'not-presenting' | 'session-started' | 'failed'
    if (ev.detail.status === "session-started") {
      arPrompt.style.display = "block";
      // На входе в AR фиксируем режим «на полу» и масштаб по коду
      viewer.setAttribute("ar-placement", "floor");
      viewer.setAttribute("ar-scale", "fixed");
    } else {
      arPrompt.style.display = "none";
    }
  });

  // Подстраиваем масштаб в предпросмотре (НЕ влияет на AR c fixed)
  scale.addEventListener("input", () => {
    const s = Number(scale.value);
    // model-viewer не имеет прямого "scale" атрибута, но можно масштабировать сцену через CSS
    viewer.style.transform = `scale(${Math.min(Math.max(s, 0.1), 3)})`;
    viewer.style.transformOrigin = "center center";
  });

  // Сброс вида/камеры и масштабирования
  reset.addEventListener("click", () => {
    viewer.resetTurntableRotation();
    viewer.cameraOrbit = "auto auto auto";
    viewer.style.transform = "scale(1)";
    scale.value = 1;
  });

  // Страховка: как только модель загрузилась — гарантируем фиксированный режим
  viewer.addEventListener("load", () => {
    viewer.setAttribute("ar-placement", "floor");
    viewer.setAttribute("ar-scale", "fixed");
  });
});
