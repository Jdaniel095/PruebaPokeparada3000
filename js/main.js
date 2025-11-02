// js/main.js
// Controla las pestañas: carga HTML desde /tabs/ y luego carga el script de la pestaña.

const tabLinks = document.querySelectorAll(".tab-link");
const tabContent = document.getElementById("tab-content");

function loadScript(src, id = "active-tab-script") {
  return new Promise((resolve, reject) => {
    // eliminar script anterior si existe
    const prev = document.getElementById(id);
    if (prev) prev.remove();

    const script = document.createElement("script");
    script.src = src;
    script.id = id;
    script.async = false; // ejecutar en orden
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.body.appendChild(script);
  });
}

function showTab(tab) {
  let url = "";
  let script = "";

  if (tab === "1") {
    url = "tabs/tab1_generate/index.html";
    script = "js/tab1_generate.js";
  } else if (tab === "2") {
    url = "tabs/tab2_manage/index.html";
    script = "js/tab2_manage.js";
  } else if (tab === "3") {
    url = "tabs/tab3_history/index.html";
    script = "js/tab3_history.js";
  } else {
    tabContent.innerHTML = "<p>Pestaña no encontrada</p>";
    return;
  }

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error("Error cargando " + url);
      return res.text();
    })
    .then(html => {
      tabContent.innerHTML = html;

      // cargar el script correspondiente y luego llamar a su init
      if (script) {
        loadScript(script).then(() => {
          const initName = `initTab${tab}`;
          if (typeof window[initName] === "function") {
            try {
              window[initName]();
            } catch (err) {
              console.error("Error en init:", err);
            }
          } else {
            // opción: console.log("No se encontró init:", initName);
          }
        }).catch(err => {
          console.error("Error cargando script:", script, err);
        });
      }
    })
    .catch(err => {
      tabContent.innerHTML = "<p style='color:red'>Error cargando contenido</p>";
      console.error(err);
    });
}

// click handlers
tabLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    // UI active
    tabLinks.forEach(l => l.classList.remove("active"));
    link.classList.add("active");

    // guardar y mostrar
    localStorage.setItem("activeTab", link.dataset.tab);
    showTab(link.dataset.tab);
  });
});

// al inicio, restaurar pestaña guardada
const savedTab = localStorage.getItem("activeTab") || "1";
const activeLink = Array.from(tabLinks).find(l => l.dataset.tab === savedTab);
if (activeLink) activeLink.classList.add("active");
showTab(savedTab);
