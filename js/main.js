// ✅ main.js — Control de pestañas + carga única de Google Maps

const tabLinks = document.querySelectorAll(".tab-link");
const tabContent = document.getElementById("tab-content");

// ✅ Scripts cargados solo una vez
const loadedScripts = new Set();

// ✅ Función para cargar scripts solo una vez (tab1, tab2, tab3)
async function loadScriptOnce(src) {
  if (loadedScripts.has(src)) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => {
      loadedScripts.add(src);
      resolve();
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

// ✅ Cargar Google Maps API solo una vez en toda la web (usa config.js)
let googleMapsLoaded = false;
function loadGoogleMapsApi() {
  return new Promise((resolve, reject) => {
    if (googleMapsLoaded) return resolve();
    const apiKey = window.APP_CONFIG?.API_KEY;
    if (!apiKey) return reject("❌ No existe API_KEY en config.js");

    const gmaps = document.createElement("script");
    gmaps.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly&loading=async`;
    gmaps.async = true;
    gmaps.defer = true;

    gmaps.onload = () => {
      googleMapsLoaded = true;
      resolve();
    };

    gmaps.onerror = () => reject("❌ Error al cargar Google Maps");
    document.head.appendChild(gmaps);
  });
}

// ✅ Control para cargar la pestaña activa
function showTab(tab) {
  let url = "";
  let script = "";
  let initFunc = "";

  if (tab === "1") {
    url = "tabs/tab1_generate/index.html";
    script = "js/tab1_generate.js";
    initFunc = "initTab1";
  } else if (tab === "2") {
    url = "tabs/tab2_manage/index.html";
    script = "js/tab2_manage.js";
    initFunc = "initTab2";
  } else if (tab === "3") {
    url = "tabs/tab3_history/index.html";
    script = "js/tab3_history.js";
    initFunc = "initTab3";
  } else {
    tabContent.innerHTML = "<p>Pestaña no encontrada</p>";
    return;
  }

  // 📌 Cargar HTML de la pestaña
  fetch(url)
    .then((res) => res.text())
    .then((html) => {
      tabContent.innerHTML = html;

      // 📌 Cargar Script de la pestaña (solo 1 vez)
      return loadScriptOnce(script);
    })
    .then(() => {
      // 📌 Cargar Google Maps si es necesario
      return loadGoogleMapsApi().catch(() => {});
    })
    .then(() => {
      // 📌 Ejecutar initTabX si existe
      if (typeof window[initFunc] === "function") {
        window[initFunc]();
      }
    })
    .catch((err) => console.error("❌ Error en showTab:", err));
}

// ✅ Evento click en pestañas
tabLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    tabLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
    localStorage.setItem("activeTab", link.dataset.tab);
    showTab(link.dataset.tab);
  });
});

// ✅ Restaurar pestaña activa al abrir página
const savedTab = localStorage.getItem("activeTab") || "1";
const activeLink = Array.from(tabLinks).find((l) => l.dataset.tab === savedTab);
if (activeLink) activeLink.classList.add("active");
showTab(savedTab);
