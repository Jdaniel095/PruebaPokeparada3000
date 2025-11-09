
// js/tab2_manage.js — Limpio (Masivo Inline + Modal Maps + Bookmarklet)

window.initTab2 = function () {
  // -----------------------------
  // Variables Globales
  // -----------------------------
  let map;
  let originalMarker;
  let newMarker;
  let geocoder;
  let propuestasCache = new Map();   // idFila -> objeto propuesta (para edición desde hoja)
  let editContext = { idFila: null }; // contexto de edición (hoja u OCR)

  const DEPLOY_URL = window.APP_CONFIG?.SHEET_URL;
  const API_KEY = window.APP_CONFIG?.API_KEY;

  if (!DEPLOY_URL) console.error("❌ APP_CONFIG.SHEET_URL no definido");
  if (!API_KEY) console.error("❌ APP_CONFIG.API_KEY no definido");

  const STORAGE_KEY = "pokecomas_wayfarer_propuestas"; // LocalStorage seguro
function getLocalPropuestas() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}
function saveLocalPropuestas(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
  

  // -----------------------------
  // UI helpers
  // -----------------------------
  function setVisible(el, show) { if (el) el.style.display = show ? "block" : "none"; }
  function setFlex(el, show) { if (el) el.style.display = show ? "flex" : "none"; }

  // -----------------------------
  // Toggle del formulario (acordeón)
  // -----------------------------
  (function setupFormToggle() {
    const container = document.getElementById("tab-content");
    if (!container) return;

    const toggleBtn = container.querySelector(".toggle-btn[data-target='#form-gestion-content']");
    const content = document.getElementById("form-gestion-content");
    if (!toggleBtn || !content) return;

    // Estado inicial
    toggleBtn.textContent = (window.getComputedStyle(content).display === "none") ? "+" : "−";

    toggleBtn.addEventListener("click", () => {
      const isHidden = window.getComputedStyle(content).display === "none";
      content.style.display = isHidden ? "block" : "none";
      toggleBtn.textContent = isHidden ? "−" : "+";
    });
  })();

  // -----------------------------
  // Checks Manual / OCR / Bookmarklet
  // -----------------------------
  (function setupModeToggles() {
    const checkManual = document.getElementById("modo-manual");
    const checkOCR = document.getElementById("modo-ocr");
    const checkBmk = document.getElementById("modo-bookmarklet");

    const bloqueManual = document.getElementById("bloque-manual");
    const bloqueOCR = document.getElementById("bloque-ocr");
    const bloqueBmk = document.getElementById("bloque-bookmarklet");

    if (checkManual && checkOCR && bloqueManual && bloqueOCR) {
      // Estado inicial → oculto
      checkManual.checked = false;
      checkOCR.checked = false;
      setVisible(bloqueManual, false);
      setVisible(bloqueOCR, false);

      checkManual.addEventListener("change", () => {
        if (checkManual.checked) {
          setVisible(bloqueManual, true);
          setVisible(bloqueOCR, false);
          if (checkOCR) checkOCR.checked = false;
          if (checkBmk) checkBmk.checked = false, setVisible(bloqueBmk, false);
        } else {
          setVisible(bloqueManual, false);
        }
      });

      checkOCR.addEventListener("change", () => {
        if (checkOCR.checked) {
          setVisible(bloqueOCR, true);
          setVisible(bloqueManual, false);
          if (checkManual) checkManual.checked = false;
          if (checkBmk) checkBmk.checked = false, setVisible(bloqueBmk, false);
        } else {
          setVisible(bloqueOCR, false);
        }
      });
    }

    if (checkBmk && bloqueBmk) {
      checkBmk.addEventListener("change", () => {
        if (checkBmk.checked) {
          setVisible(bloqueBmk, true);
          if (checkManual) checkManual.checked = false, setVisible(bloqueManual, false);
          if (checkOCR) checkOCR.checked = false, setVisible(bloqueOCR, false);
        } else {
          setVisible(bloqueBmk, false);
        }
      });
    }
  })();

  // -----------------------------
  // BOOKMARKLET (ÚNICO OFICIAL)
  // -----------------------------
const BOOKMARKLET_CODE = `javascript:(async function(){try{const panel=document.querySelector('.details-pane');const item=document.querySelector('.submissions-item--selected');if(!panel||!item){alert('⚠️ Abre una propuesta (haz clic en ella) antes de guardar.');return;}let titulo=panel.querySelector('.details-pane__poiTitle')?.innerText.trim()||'(Sin título)';let img=item.querySelector('img.object-cover')?.src||'';let estado=panel.querySelector('.submission-tag span')?.innerText.trim()||'Desconocido';let tipo='Propuesta de Pokeparada';const h4=panel.querySelector('h4');if(h4&&h4.innerText.includes('Modificación')){tipo='Movimiento de Pokeparada';}if(h4&&h4.innerText.includes('Reubicación')){tipo='Propuesta con Reubicación';}let fecha=panel.querySelector('span.text-sm.whitespace-nowrap')?.innerText.trim()||'';let coorActual='';let coorNueva='';const allH5=panel.querySelectorAll('h5');const h5Actual=Array.from(allH5).find(el=>el.innerText.includes('Ubicación de Wayspot actual'));if(h5Actual){const match=h5Actual.nextElementSibling?.innerText.match(/-?\\d+\\.\\d+,\\s*-?\\d+\\.\\d+/);if(match)coorActual=match[0];}const h5Nueva=Array.from(allH5).find(el=>el.innerText.includes('Tu modificación'));if(h5Nueva){const match=h5Nueva.nextElementSibling?.innerText.match(/-?\\d+\\.\\d+,\\s*-?\\d+\\.\\d+/);if(match)coorNueva=match[0];}const key='wayfarer_manual_import';const data=JSON.parse(localStorage.getItem(key)||'[]');const existe=data.some(d=>d.titulo===titulo&&d.fecha===fecha);let alertMessage='';if(!existe){data.push({titulo,img,estado,tipo,fecha,coorActual,coorNueva});localStorage.setItem(key,JSON.stringify(data));alertMessage='✅ Guardado ('+data.length+' propuestas)';}else{alertMessage='ℹ️ Ya guardada ('+data.length+' total)';}await navigator.clipboard.writeText(JSON.stringify(data,null,2));alert(alertMessage+'\\n📋 ¡Portapapeles actualizado!');}catch(e){alert('❌ Error: '+e.message);}})();`;

document.getElementById("btn-copiar-bookmarklet")?.addEventListener("click", () => {
  navigator.clipboard.writeText(BOOKMARKLET_CODE).then(() => {
    alert("✅ Bookmarklet copiado. Arrástralo a tu barra de marcadores o pégalo manualmente.");
  });
});

  // -----------------------------
  // Local Cache para propuestas (desde hoja)
  // -----------------------------
  const LOCAL_KEY = "pokecomas_propuestas_cache";
  const CACHE_TIME = 5 * 60 * 1000; // 5 minutos

  function saveToLocalCache(data) {
    if (!data) return localStorage.removeItem(LOCAL_KEY);
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ timestamp: Date.now(), propuestas: data }));
  }
  function getFromLocalCache() {
    const cached = localStorage.getItem(LOCAL_KEY);
    if (!cached) return null;
    try {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp > CACHE_TIME) return null;
      return data.propuestas;
    } catch { return null; }
  }

  // -----------------------------
  // Cargar tarjetas desde hoja (con cache)
  // -----------------------------
  async function cargarTarjetas(forceRefresh = false) {
    const cont = document.getElementById("gestion-lista-tarjetas");
    if (!cont) return;

    if (!forceRefresh) {
      const cache = getFromLocalCache();
      if (cache) {
        renderTarjetas(cache);
        return;
      }
    }

    cont.innerHTML = `<p style="text-align:center;color:#ecf0f1;">Cargando propuestas... 🔄</p>`;
    try {
      const res = await fetch(`${DEPLOY_URL}?action=getWayfarerPropuestas`);
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.propuestas)) throw new Error(data.mensaje || "Sin datos");
      saveToLocalCache(data.propuestas);
      renderTarjetas(data.propuestas);
    } catch (err) {
      console.error("❌ Error al cargar propuestas:", err);
      cont.innerHTML = `<p style="color:red; text-align:center;">Error al cargar propuestas.</p>`;
    }
  }

// ✅ IMPORTAR DATOS DESDE LOCALSTORAGE (Bookmarklet)
document.getElementById("btn-importar-clipboard")?.addEventListener("click", () => {
  const key = "wayfarer_manual_import"; // Donde el bookmarklet guarda los datos
  const data = localStorage.getItem(key);

  if (!data) {
    alert("⚠ No hay datos guardados por el bookmarklet.\nPrimero ve a Wayfarer, abre una propuesta y ejecuta el bookmarklet.");
    return;
  }

  try {
    const propuestas = JSON.parse(data);
    if (!Array.isArray(propuestas) || propuestas.length === 0) {
      alert("⚠ No se encontraron propuestas válidas.");
      return;
    }

    // ✅ Convertir al formato de tarjetas tipo OCR
ocrResultados = propuestas.map(p => ({
  titulo: p.titulo || "(Sin título)",
  tipo: p.tipo === "Propuesta de Pokeparada" ? "Propuesta de Pokeparada" :
        p.tipo === "Propuesta con Reubicación" ? "Propuesta con Reubicación" :
        p.tipo === "Movimiento de Pokeparada" ? "Movimiento de Pokeparada" :
        "Propuesta de Pokeparada",
  estado: p.estado || "En Cola",
  img: p.img || "",
  coorActual: p.coorActual || "",
  coorModificada: p.coorModificada || p.coorNueva || "",
  fecha: p.fecha || new Date().toISOString().split("T")[0]
}));



    // ✅ Mostrar en pantalla
    if (typeof mostrarResultadosOCR === "function") {
      mostrarResultadosOCR();
    }

    alert(`✅ Se importaron ${ocrResultados.length} propuestas desde el Bookmarklet ✅`);

    // ❗ Si quieres borrar después de usar, descomenta lo siguiente:
    // localStorage.removeItem(key);

  } catch (e) {
    console.error(e);
    alert("❌ Error procesando los datos guardados.");
  }
});



  // -----------------------------
  // Render tarjetas (vista de gestión)
  // -----------------------------
  function generarHtmlDeTarjeta(p) {
    const tipo = (p.clasificado || "").trim();
    const estado = (p.estado || "").trim();

    // Imagen principal (ID Google o URL)
    const imgUrl = p.img
      ? (p.img.startsWith("http") ? p.img : `https://lh3.googleusercontent.com/${p.img}=s400`)
      : "assets/sinimagenpokeparada.png";

    // Tipo
    let tipoTag = `<span class="prop-tag tag-nueva tag-tipo-propuesta">Propuesta de Pokeparada</span>`;
    if (tipo === "Movimiento de Pokeparada") {
      tipoTag = `<span class="prop-tag tag-mover tag-tipo-propuesta">Movimiento de Pokeparada</span>`;
    } else if (tipo === "Propuesta con Reubicación") {
      tipoTag = `<span class="prop-tag tag-reubicada tag-tipo-propuesta">Propuesta con Reubicación</span>`;
    }

    // Estado
    let estadoTag = "";
    if (estado === "En Votacion") estadoTag = `<span class="prop-tag estado-votacion">En Votación</span>`;
    else if (estado === "En Cola") estadoTag = `<span class="prop-tag estado-cola">En Cola</span>`;
    else if (estado === "Aceptada") estadoTag = `<span class="prop-tag estado-aceptada">Aceptada</span>`;
    else if (estado === "Rechazada") estadoTag = `<span class="prop-tag estado-rechazada">Rechazada</span>`;

   // Coordenadas
const tienePar = p.coorActual && p.coorModificada;
let ubicacionHtml = `<p><b>Dirección:</b> ${p.direccion || "(No disponible)"}</p>`;
if (tienePar) {
  ubicacionHtml += `<p><b>Original:</b> ${p.coorActual}</p><p><b>Modificada:</b> ${p.coorModificada}</p>`;
} else {
  ubicacionHtml += `<p><b>Coordenadas:</b> ${p.coorActual || "-"}</p>`;
}

    // StaticMap
    let mapaUrl = `https://maps.googleapis.com/maps/api/staticmap?size=360x300&scale=2&maptype=satellite&key=${API_KEY}`;
    if (tienePar) {
      mapaUrl +=
        `&visible=${p.coorActual}|${p.coorModificada}` +
        `&markers=icon:https://wayfarer.nianticlabs.com/imgpub/marker-orange-transparent-64.png%7C${p.coorActual}` +
        `&markers=icon:https://wayfarer.nianticlabs.com/imgpub/marker-green-64.png%7C${p.coorModificada}`;
    } else if (p.coorActual) {
      mapaUrl += `&zoom=18&markers=icon:https://wayfarer.nianticlabs.com/imgpub/marker-green-64.png%7C${p.coorActual}`;
    } else {
      mapaUrl = "assets/sinubi.png";
    }

    return `
      <article class="gestion-card" data-id-fila="${p.id}">
        <div class="imagen-area">
          <img src="${imgUrl}" class="imagen-principal">
          ${tipoTag}
          <button class="btn-editar-propuesta" data-id="${p.id}">Editar</button>
        </div>
        <div class="contenido">
          <span class="prop-titulo">${p.titulo || "Sin título"}</span>
          <div class="tag-container">${estadoTag}</div>
          <div class="ubicacion">${ubicacionHtml}</div>
        </div>
        <div class="mapa">
          <img src="${mapaUrl}"
               class="mapa-miniatura"
               data-coor-actual="${p.coorActual || ""}"
               data-coor-modificada="${p.coorModificada || ""}"
               style="width:100%;height:100%;object-fit:cover;cursor:pointer;">
        </div>
      </article>
    `;
  }

  function renderTarjetas(lista) {
    const cont = document.getElementById("gestion-lista-tarjetas");
    if (!cont) return;
    let html = "";
    propuestasCache = new Map();
    lista.forEach((p) => {
      propuestasCache.set(p.id, p);
      html += generarHtmlDeTarjeta(p);
    });
    cont.innerHTML = html;
  }

  // -----------------------------
  // Buscador en tarjetas (gestión)
  // -----------------------------
  (function initBuscador() {
    const buscador = document.getElementById("buscador-propuesta");
    if (!buscador) return;
    buscador.addEventListener("input", function () {
      const texto = this.value.trim().toLowerCase();
      document.querySelectorAll(".gestion-card").forEach((card) => {
        const titulo = card.querySelector(".prop-titulo")?.textContent.toLowerCase() || "";
        const ubic = card.querySelector(".ubicacion")?.textContent.toLowerCase() || "";
        const estado = card.querySelector(".tag-container")?.textContent.toLowerCase() || "";
        card.style.display = (titulo.includes(texto) || ubic.includes(texto) || estado.includes(texto)) ? "" : "none";
      });

      const toggleBtn = document.querySelector("#form-gestion-card .toggle-btn");
      const content = document.querySelector("#form-gestion-content");
      if (content && toggleBtn && content.style.display !== "none") {
        content.style.display = "none";
        toggleBtn.textContent = "+";
      }
    });
  })();

  // -----------------------------
  // Formularios: validar + armar payload + guardar (1 sola versión)
  // -----------------------------
  function validarFormularioActual() {
    const tipo = document.getElementById("tipo-propuesta-select").value;
    const nombre = document.getElementById("gestion-nombre").value.trim();
    if (!nombre) {
      alert('El campo "Tu Nick (Wayfarer/PoGo)" no puede estar vacío.');
      document.getElementById("gestion-nombre").focus();
      return false;
    }
    if (tipo === "nueva") {
      if (!document.getElementById("nueva-titulo").value.trim()) {
        alert('El campo "Título" no puede estar vacío.'); document.getElementById("nueva-titulo").focus(); return false;
      }
      if (!document.getElementById("nueva-coordenadas").value.trim()) {
        alert('El campo "Coordenadas" no puede estar vacío.'); document.getElementById("nueva-coordenadas").focus(); return false;
      }
    }
    if (tipo === "reubicacion") {
      if (!document.getElementById("nueva-titulo-reu").value.trim()) {
        alert('El campo "Título" no puede estar vacío.'); document.getElementById("nueva-titulo-reu").focus(); return false;
      }
      if (!document.getElementById("nueva-coordenadas-reu").value.trim()) {
        alert('El campo "Coordenadas Iniciales" no puede estar vacío.'); document.getElementById("nueva-coordenadas-reu").focus(); return false;
      }
    }
    if (tipo === "mover") {
      if (!document.getElementById("mover-titulo").value.trim()) {
        alert('El campo "Título" no puede estar vacío.'); document.getElementById("mover-titulo").focus(); return false;
      }
      if (!document.getElementById("mover-coor-actual").value.trim()) {
        alert('El campo "Coordenada Actual" no puede estar vacío.'); document.getElementById("mover-coor-actual").focus(); return false;
      }
      if (!document.getElementById("mover-coor-modificada").value.trim()) {
        alert('El campo "Coordenada Modificada" no puede estar vacío.'); document.getElementById("mover-coor-modificada").focus(); return false;
      }
    }
    return true;
  }

  function obtenerDatosFormularioActual() {
    const tipo = document.getElementById("tipo-propuesta-select").value;
    const estado = document.getElementById("gestion-estado").value;
    const nombre = document.getElementById("gestion-nombre").value.trim();

    const datos = { action: "guardarWayfarer", tipo, estado, nombre, fecha: new Date().toISOString() };

    if (tipo === "nueva") {
      datos.titulo = document.getElementById("nueva-titulo").value.trim();
      datos.coorActual = document.getElementById("nueva-coordenadas").value.trim();
      datos.coorModificada = "";
      datos.direccion = document.getElementById("nueva-direccion").value || "";
      let img = document.getElementById("nueva-img").value.trim();
      if (img && img.includes("googleusercontent.com/")) img = img.split("/").pop().split("=")[0];
      datos.img = img;
      datos.tipoClasificado = "Propuesta de Pokeparada"; //
    }   // ❗️ AQUÍ VA TU CÓDIGO
  else if (tipo === "reubicacion") {
    datos.titulo = document.getElementById("nueva-titulo-reu").value.trim();

    // ✅ TU LÍNEA EXACTA AQUÍ
    datos.coorActual = document.getElementById("nueva-coordenadas-reu").value.trim();
    datos.coorModificada = document.getElementById("nueva-coordenadas-reubicadas-reu").value.trim() || "";

    datos.direccion = document.getElementById("nueva-direccion").value || "";
    let img = document.getElementById("nueva-img-reu").value.trim();
    if (img && img.includes("googleusercontent.com/")) img = img.split("/").pop().split("=")[0];
    datos.img = img;
  
    } else if (tipo === "mover") {
      datos.titulo = document.getElementById("mover-titulo").value.trim();
      datos.coorActual = document.getElementById("mover-coor-actual").value.trim();
      datos.coorModificada = document.getElementById("mover-coor-modificada").value.trim();
      datos.direccion = document.getElementById("mover-direccion").value || "";
      let img = document.getElementById("mover-img").value.trim();
      if (img && img.includes("googleusercontent.com/")) img = img.split("/").pop().split("=")[0];
      datos.img = img;
    }

    const mapaClasificado = {
      nueva: "Propuesta de Pokeparada",
      reubicacion: "Propuesta con Reubicación",
      mover: "Movimiento de Pokeparada"
    };
    datos.tipoClasificado = mapaClasificado[tipo] || "Propuesta de Pokeparada";
    return datos;
  }

  async function enviarPropuestaActual(btn) {
    if (!validarFormularioActual()) return;
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = "Guardando... ⏳";
    try {
      const datos = obtenerDatosFormularioActual();
      const fd = new FormData();
      fd.append("data", JSON.stringify(datos));
      const res = await fetch(DEPLOY_URL, { method: "POST", body: fd });
      const out = await res.json();
      if (!out.ok) throw new Error(out.mensaje || "Error en el servidor");
      alert(out.mensaje || "✅ ¡Propuesta guardada con éxito!");
      limpiarSoloCamposFormulario();
      limpiarListaMasiva(true);
      cargarTarjetas(true);
      // ✅ Marcar como subido en localStorage (si existe en local)
let propuestas = getLocalPropuestas();
propuestas = propuestas.map(p => {
  if (p.titulo === datos.titulo && p.fecha === datos.fecha) {
    return { ...p, subido: true };
  }
  return p;
});
saveLocalPropuestas(propuestas);

// ✅ Mostrar solo las pendientes nuevamente
if (typeof mostrarResultadosOCR === "function") {
  ocrResultados = propuestas.filter(p => p.subido === false);
  mostrarResultadosOCR();
}

    } catch (err) {
      alert("❌ Error al guardar: " + err.message);
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  }

  function limpiarSoloCamposFormulario() {
    const tipo = document.getElementById("tipo-propuesta-select").value;
    if (tipo === "nueva") {
      document.getElementById("nueva-titulo").value = "";
      document.getElementById("nueva-coordenadas").value = "";
      document.getElementById("nueva-img").value = "";
      document.getElementById("nueva-direccion").value = "";
    } else if (tipo === "reubicacion") {
      document.getElementById("nueva-titulo-reu").value = "";
      document.getElementById("nueva-coordenadas-reu").value = "";
      document.getElementById("nueva-img-reu").value = "";
      document.getElementById("nueva-coordenadas-reubicadas-reu").value = "";
    } else if (tipo === "mover") {
      document.getElementById("mover-titulo").value = "";
      document.getElementById("mover-img").value = "";
      document.getElementById("mover-coor-actual").value = "";
      document.getElementById("mover-coor-modificada").value = "";
    }
  }

  // -----------------------------
  // Modo Carga Masiva Inline
  // -----------------------------
  let propuestasMasivasInline = [];
  const checkMasivo = document.getElementById("activar-masivo");
  const bloqueMasivo = document.getElementById("bloque-masivo-inline");
  const btnGuardar = document.getElementById("btn-guardar-propuesta");
  const contadorInline = document.getElementById("contador-masiva-inline");
  const listaInline = document.getElementById("lista-propuestas-inline");
  const btnGuardarTodasInline = document.getElementById("btn-guardar-todas-inline");

  function actualizarListaMasivaInline() {
    if (!listaInline || !contadorInline) return;
    listaInline.innerHTML = "";
    propuestasMasivasInline.forEach((p, i) => {
      const coordTexto = (p.tipo === "reubicacion" || p.tipo === "mover")
        ? `${p.coords?.original || "(sin original)"} → ${p.coords?.nueva || "(sin nueva)"}`
        : (p.coords || "(sin coordenadas)");
      const li = document.createElement("li");
      li.innerHTML = `<b>${i + 1}.</b> [${p.tipo}] ${p.titulo} — 
        <small>${coordTexto}</small>
        <button data-index="${i}" class="btn-eliminar-item" style="margin-left:8px;">❌</button>`;
      listaInline.appendChild(li);
    });
    contadorInline.textContent = propuestasMasivasInline.length;

    listaInline.querySelectorAll(".btn-eliminar-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.getAttribute("data-index"), 10);
        propuestasMasivasInline.splice(idx, 1);
        actualizarListaMasivaInline();
      });
    });
  }

  function limpiarListaMasiva(apagar = false) {
    propuestasMasivasInline = [];
    actualizarListaMasivaInline?.();
    if (!checkMasivo || !bloqueMasivo || !btnGuardar) return;
    if (apagar) {
      checkMasivo.checked = false;
      btnGuardar.textContent = "Subir Propuesta";
      setVisible(bloqueMasivo, false);
    } else {
      if (checkMasivo.checked) {
        btnGuardar.textContent = "➕ Agregar a lista";
        setVisible(bloqueMasivo, true);
      } else {
        btnGuardar.textContent = "Subir Propuesta";
        setVisible(bloqueMasivo, false);
      }
    }
  }

  if (checkMasivo) {
    checkMasivo.addEventListener("change", () => {
      if (checkMasivo.checked) {
        btnGuardar.textContent = "➕ Agregar a lista";
        setVisible(bloqueMasivo, true);
      } else {
        btnGuardar.textContent = "Subir Propuesta";
        setVisible(bloqueMasivo, false);
        propuestasMasivasInline = [];
        actualizarListaMasivaInline();
      }
    });
  }

  if (btnGuardar) {
    btnGuardar.addEventListener("click", async (ev) => {
      if (!checkMasivo?.checked) return await enviarPropuestaActual(ev.currentTarget);

      const tipo = document.getElementById("tipo-propuesta-select").value;
      let titulo = "", coords = "", img = "", direccion = "";
      if (tipo === "nueva") {
        titulo = document.getElementById("nueva-titulo").value.trim();
        coords = document.getElementById("nueva-coordenadas").value.trim();
        img = document.getElementById("nueva-img").value.trim();
        direccion = document.getElementById("nueva-direccion").value.trim();
      } else if (tipo === "reubicacion") {
        titulo = document.getElementById("nueva-titulo-reu").value.trim();
        coords = {
          original: document.getElementById("nueva-coordenadas-reu").value.trim(),
          nueva: document.getElementById("nueva-coordenadas-reubicadas-reu").value.trim()
        };
        img = document.getElementById("nueva-img-reu").value.trim();
        direccion = document.getElementById("nueva-direccion").value.trim();
      } else {
        titulo = document.getElementById("mover-titulo").value.trim();
        coords = {
          original: document.getElementById("mover-coor-actual").value.trim(),
          nueva: document.getElementById("mover-coor-modificada").value.trim()
        };
        img = document.getElementById("mover-img").value.trim();
        direccion = document.getElementById("mover-direccion").value.trim();
      }

      if (!titulo) return alert("⚠️ El Título es obligatorio.");
      if (tipo === "nueva" && !coords) return alert("⚠️ Las coordenadas son obligatorias.");
      if (tipo === "reubicacion" && !coords.original) return alert("⚠️ La coordenada inicial es obligatoria en reubicación.");
      if (tipo === "mover" && (!coords.original || !coords.nueva)) return alert("⚠️ En movimiento debes indicar coordenadas Original y Nueva.");

      propuestasMasivasInline.push({ tipo, titulo, coords, img, direccion, fecha: new Date().toISOString() });
      actualizarListaMasivaInline();
      limpiarSoloCamposFormulario();
    });
  }

  if (btnGuardarTodasInline) {
    btnGuardarTodasInline.addEventListener("click", async () => {
      if (propuestasMasivasInline.length === 0) return alert("⚠️ La lista está vacía.");
      const nombre = document.getElementById("gestion-nombre").value.trim();
      if (!nombre) { alert('El campo "Tu Nick (Wayfarer/PoGo)" no puede estar vacío.'); return document.getElementById("gestion-nombre").focus(); }

      btnGuardarTodasInline.disabled = true;
      const old = btnGuardarTodasInline.textContent;
      btnGuardarTodasInline.textContent = "Guardando lote... ⏳";

      let ok = 0, fail = 0;
      for (const p of propuestasMasivasInline) {
        const estado = document.getElementById("gestion-estado").value;
        let datos = {
          action: "guardarWayfarer",
          tipo: p.tipo,
          estado,
          nombre,
          fecha: p.fecha || new Date().toISOString(),
          titulo: p.titulo,
          img: p.img || "",
          tipoClasificado: p.tipo === "mover" ? "Movimiento de Pokeparada" :
                           p.tipo === "reubicacion" ? "Propuesta con Reubicación" : "Propuesta de Pokeparada"
        };
        if (p.tipo === "nueva") {
          datos.coorActual = p.coords || "";
          datos.coorModificada = "";
          datos.direccion = p.direccion || "";
        } else {
          datos.coorActual = p.coords?.original || "";
          datos.coorModificada = p.coords?.nueva || "";
          datos.direccion = p.direccion || "";
        }
        if (datos.img && datos.img.includes("googleusercontent.com/")) {
          datos.img = datos.img.split("/").pop().split("=")[0];
        }
        try {
          const fd = new FormData();
          fd.append("data", JSON.stringify(datos));
          const res = await fetch(DEPLOY_URL, { method: "POST", body: fd });
          const out = await res.json();
          if (!out.ok) throw new Error(out.mensaje || "Error");
          ok++;
        } catch (e) { console.error("Guardado masivo error item:", p, e); fail++; }
      }

      alert(`📦 Lote finalizado.\n✅ OK: ${ok}\n❌ Fallidos: ${fail}`);
      btnGuardarTodasInline.disabled = false;
      btnGuardarTodasInline.textContent = old;
      if (ok > 0) {
        limpiarSoloCamposFormulario();
        limpiarListaMasiva(true);
        cargarTarjetas(true);
        // ✅ Marcar como subidos en localStorage si estaban importados desde el Bookmarklet
let propuestasLocal = getLocalPropuestas();
propuestasLocal = propuestasLocal.map(lp => {
  const existe = propuestasMasivasInline.find(pm => pm.titulo === lp.titulo && pm.fecha === lp.fecha);
  if (existe) {
    return { ...lp, subido: true };
  }
  return lp;
});
saveLocalPropuestas(propuestasLocal);

// ✅ Actualizar vista OCR solo con los no subidos
if (typeof mostrarResultadosOCR === "function") {
  ocrResultados = propuestasLocal.filter(p => p.subido === false);
  mostrarResultadosOCR();
}

      }
    });
  }

  // -----------------------------
  // Google Maps helpers
  // -----------------------------
  function parseCoords(coordString) {
    if (!coordString) return null;
    const parts = coordString.split(",");
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  }

  function initMap(originalCoordsStr, reubicacionCoordsStr) {
    const mapCanvas = document.getElementById("map-canvas");
    if (!mapCanvas) return;

    if (!window.google || !window.google.maps) {
      loadGoogleMapsApi().then(() => initMap(originalCoordsStr, reubicacionCoordsStr));
      return;
    }

    if (originalMarker) originalMarker.setMap(null);
    if (newMarker) newMarker.setMap(null);
    originalMarker = null; newMarker = null;

    const originalCoords = parseCoords(originalCoordsStr);
    const reubCoords = parseCoords(reubicacionCoordsStr);
    const centerCoords = reubCoords || originalCoords || { lat: -11.964658, lng: -77.061995 };

    map = new google.maps.Map(mapCanvas, {
      center: centerCoords,
      zoom: 17,
      mapTypeId: "hybrid",
      disableDefaultUI: true,
      gestureHandling: "greedy",
      zoomControl: false,
      fullscreenControl: true,
      mapTypeControl: false,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
        { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
        { featureType: "landscape.man_made", stylers: [{ visibility: "off" }] }
      ]
    });

    if (originalCoords) {
      originalMarker = new google.maps.Marker({
        position: originalCoords,
        map,
        icon: "https://wayfarer.nianticlabs.com/imgpub/marker-orange-transparent-64.png",
        title: "Ubicación original"
      });
    }
    if (reubCoords) {
      newMarker = new google.maps.Marker({
        position: reubCoords,
        map,
        icon: "https://wayfarer.nianticlabs.com/imgpub/marker-green-64.png",
        title: "Nueva ubicación",
        draggable: true
      });
    }
    map.addListener("click", (e) => {
      const pos = e.latLng;
      if (!newMarker) {
        newMarker = new google.maps.Marker({
          position: pos,
          map,
          icon: "https://wayfarer.nianticlabs.com/imgpub/marker-green-64.png",
          title: "Nueva ubicación",
          draggable: true
        });
      } else {
        newMarker.setPosition(pos);
      }
    });
  }

  function initMapMiniatura(originalCoordsStr, reubicacionCoordsStr) {
    const mapCanvas = document.getElementById("map-canvas-miniatura");
    if (!mapCanvas) return;

    if (!window.google || !window.google.maps) {
      loadGoogleMapsApi().then(() => initMapMiniatura(originalCoordsStr, reubicacionCoordsStr));
      return;
    }

    if (originalMarker) originalMarker.setMap(null);
    if (newMarker) newMarker.setMap(null);
    originalMarker = null; newMarker = null;

    const originalCoords = parseCoords(originalCoordsStr);
    const reubCoords = parseCoords(reubicacionCoordsStr);
    const centerCoords = reubCoords || originalCoords || { lat: -12.046374, lng: -77.042793 };

    map = new google.maps.Map(mapCanvas, {
      center: centerCoords,
      zoom: 18,
      mapTypeId: "satellite",
      disableDefaultUI: true,
      gestureHandling: "greedy",
      styles: [
        { featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
        { featureType: "poi", elementType: "geometry", stylers: [{ visibility: "off" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ visibility: "off" }] },
        { featureType: "transit", elementType: "geometry", stylers: [{ visibility: "off" }] }
      ]
    });

    if (originalCoords) {
      new google.maps.Marker({
        position: originalCoords,
        map,
        icon: "https://wayfarer.nianticlabs.com/imgpub/marker-orange-transparent-64.png",
        title: "Ubicación"
      });
    }
    if (reubCoords) {
      new google.maps.Marker({
        position: reubCoords,
        map,
        icon: "https://wayfarer.nianticlabs.com/imgpub/marker-green-64.png",
        title: "Ubicación Alterna"
      });
    }
  }

  // Geocoding
  async function fetchGeocode(coordInput) {
    if (!geocoder) {
      try {
        await loadGoogleMapsApi();
        geocoder = new google.maps.Geocoder();
      } catch (err) {
        console.error("❌ Error al cargar Maps/Geocoder:", err);
        alert("No se pudo cargar el servicio de direcciones.");
        return;
      }
    }
    const coords = parseCoords(coordInput.value);
    if (!coords) return;

    const inputId = coordInput.id;
    let hiddenId = "";
    if (inputId === "nueva-coordenadas") hiddenId = "nueva-direccion";
    else if (inputId === "mover-coor-actual") hiddenId = "mover-direccion";
    else if (inputId === "nueva-coordenadas-reu") hiddenId = "nueva-direccion";
    else return;

    const hidden = document.getElementById(hiddenId);
    if (!hidden) return;

    try {
      const resp = await geocoder.geocode({ location: coords });
      if (!resp.results || !resp.results[0]) {
        hidden.value = "Dirección no encontrada";
        return;
      }
      const comp = resp.results[0].address_components;
      const numero = comp.find((c) => c.types.includes("street_number"))?.long_name || "";
      const calle = comp.find((c) => c.types.includes("route"))?.long_name || "";
      let distrito =
        comp.find((c) => c.types.includes("locality"))?.long_name ||
        comp.find((c) => c.types.includes("administrative_area_level_3"))?.long_name || "";
      let provincia = comp.find((c) => c.types.includes("administrative_area_level_2"))?.long_name || "";
      const pais = comp.find((c) => c.types.includes("country"))?.long_name || "";
      if (distrito) distrito = distrito.replace(/^Distrito de\s*/i, "").trim();
      if (provincia) provincia = provincia.replace(/^Provincia de\s*/i, "").trim();
      if (provincia && distrito && provincia.toLowerCase() === distrito.toLowerCase()) provincia = "";

      const direccionCustom = [
        calle ? `${calle}${numero ? " " + numero : ""}` : "",
        distrito,
        provincia ? provincia : "",
        pais ? `- ${pais}` : ""
      ].filter(Boolean).join(", ").replace(/,\s-,/g, "-").replace(/\s{2,}/g, " ").trim();

      hidden.value = direccionCustom;
    } catch (err) {
      console.error("Error de Geocoding:", err);
      hidden.value = "Error de Geocoding";
    }
  }

  // Disparar geocoding al perder foco (delegado)
  document.body.addEventListener("blur", function (e) {
    if (e.target.classList.contains("geocode-trigger")) fetchGeocode(e.target);
  }, true);

  // -----------------------------
  // Delegación de eventos: mapas / tipos de formulario
  // -----------------------------
  document.body.addEventListener("change", function (e) {
    if (e.target.id === "reubicacion-check") {
      const fila = document.getElementById("fila-reubicacion-form");
      const modal = document.getElementById("mapModal");
      const coordOriginal = document.getElementById("nueva-coordenadas-reu").value;
      if (e.target.checked) {
        setFlex(fila, true);
        modal.classList.add("visible");
        loadGoogleMapsApi().then(() => initMap(coordOriginal, ""));
      } else {
        setFlex(fila, false);
        const inputDestino = document.getElementById("nueva-coordenadas-reubicadas-reu");
        if (inputDestino) inputDestino.value = "";
        modal.classList.remove("visible");
        if (newMarker) newMarker.setMap(null);
      }
    }

    if (e.target.id === "tipo-propuesta-select") {
      const tipo = e.target.value;
      setVisible(document.getElementById("form-nueva-propuesta"), tipo === "nueva");
      setVisible(document.getElementById("form-reubicacion"), tipo === "reubicacion");
      setVisible(document.getElementById("form-mover-propuesta"), tipo === "mover");
    }
  });

  document.body.addEventListener("click", function (e) {
    // Modal grande
    if (e.target.id === "map-btn-cancelar") {
      document.getElementById("mapModal").classList.remove("visible");
    }
    if (e.target.id === "map-btn-guardar") {
      if (!newMarker) return alert("Selecciona una nueva ubicación en el mapa.");
      const { lat, lng } = newMarker.getPosition().toJSON();
      const val = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      const outReu = document.getElementById("nueva-coordenadas-reubicadas-reu");
      if (outReu) outReu.value = val;
      const outEdit = document.getElementById("edit-coor-modificada");
      if (outEdit) outEdit.value = val;
      document.getElementById("mapModal").classList.remove("visible");
    }

    // Ver mapa on-demand
    if (e.target.classList.contains("btn-ver-mapa")) {
      const tipo = document.getElementById("tipo-propuesta-select").value;
      let orig = "", reub = "";
      if (tipo === "nueva") {
        orig = document.getElementById("nueva-coordenadas").value;
      } else if (tipo === "reubicacion") {
        orig = document.getElementById("nueva-coordenadas-reu").value;
        reub = document.getElementById("nueva-coordenadas-reubicadas-reu").value;
      } else if (tipo === "mover") {
        orig = document.getElementById("mover-coor-actual").value;
        reub = document.getElementById("mover-coor-modificada").value;
      }
      document.getElementById("mapModal").classList.add("visible");
      loadGoogleMapsApi().then(() => initMap(orig, reub));
    }

    // Mini mapa en tarjetas
    if (e.target.classList.contains("mapa-miniatura")) {
      const orig = e.target.dataset.coorActual;
      const reub = e.target.dataset.coorModificada;
      const modalMini = document.getElementById("mapModalMiniatura");
      modalMini.classList.add("visible");
      loadGoogleMapsApi().then(() => initMapMiniatura(orig, reub));
    }
    if (e.target.id === "mapMiniatura-btn-cerrar") {
      document.getElementById("mapModalMiniatura").classList.remove("visible");
    }

    // Botón Editar tarjeta (desde hoja)
    if (e.target.classList.contains("btn-editar-propuesta")) {
      const idFila = Number(e.target.dataset.id);
      const p = propuestasCache.get(idFila);
      if (!p) return alert("⚠️ No se encontró la propuesta seleccionada.");

      editContext = { idFila, tipo: "sheet" };

      const modal = document.getElementById("modal-editar");
      modal.classList.add("visible");

      // Solo campo Nick visible al inicio
      document.querySelectorAll("#modal-editar .form-group, .modal-editar-botones").forEach(el => el.style.display = "none");
      document.getElementById("editar-nick").value = "";
      document.getElementById("editar-nick").style.display = "block";
      document.getElementById("btn-validar-nick").style.display = "block";
    }
  });

  // Validar Nick y cargar datos en modal
  document.getElementById("btn-validar-nick")?.addEventListener("click", () => {
    const nickIngresado = document.getElementById("editar-nick").value.trim().toLowerCase();
    if (!nickIngresado) return alert("⚠️ Ingresa tu Nick para continuar");

    const p = propuestasCache.get(editContext.idFila);
    if (!p) return alert("⚠️ No hay propuesta seleccionada.");
    const autorOriginal = (p.nombre || "").trim().toLowerCase();
    if (nickIngresado !== autorOriginal) return alert("⚠️ Este Nick no coincide con el creador de la propuesta.");

    // Mostrar campos
    document.querySelectorAll("#modal-editar .form-group, .modal-editar-botones").forEach(el => el.style.display = "block");
    document.getElementById("btn-validar-nick").style.display = "none";

    // Llenar datos
    document.getElementById("edit-titulo").value = p.titulo || "";
    document.getElementById("edit-estado").value = p.estado || "En Cola";
    document.getElementById("edit-img").value = p.img || "";
    document.getElementById("edit-direccion").value = p.direccion || "";
    document.getElementById("edit-coor-actual").value = p.coorActual || "";
    document.getElementById("edit-coor-modificada").value = p.coorModificada || "";

    const mapaReverse = {
      "Propuesta de Pokeparada": "nueva",
      "Propuesta con Reubicación": "reubicacion",
      "Movimiento de Pokeparada": "mover"
    };
    const valor = mapaReverse[p.clasificado] || "nueva";
    document.getElementById("edit-tipo").value = valor;
    toggleCamposPorTipo(valor);
  });

  // Modal editar: mostrar/ocultar campos por tipo
  function toggleCamposPorTipo(tipo) {
    const campoMod = document.getElementById("edit-coor-modificada")?.closest(".form-group");
    if (!campoMod) return;
    campoMod.style.display = (tipo === "nueva") ? "none" : "block";
  }
  document.getElementById("edit-tipo")?.addEventListener("change", function () {
    toggleCamposPorTipo(this.value);
  });

  // Cerrar modal editar
  document.getElementById("modal-editar-cerrar")?.addEventListener("click", () => {
    document.getElementById("modal-editar").classList.remove("visible");
  });
  document.getElementById("btn-cancelar-edicion")?.addEventListener("click", () => {
    document.getElementById("modal-editar").classList.remove("visible");
  });

  // Abrir mapa desde modal editar
  document.getElementById("edit-abrir-mapa")?.addEventListener("click", () => {
    const orig = document.getElementById("edit-coor-actual").value.trim();
    const reub = document.getElementById("edit-coor-modificada").value.trim();
    document.getElementById("mapModal").classList.add("visible");
    loadGoogleMapsApi().then(() => initMap(orig, reub));
  });

  // Guardar edición (detecta OCR vs hoja)
  document.getElementById("btn-guardar-edicion")?.addEventListener("click", async () => {
    if (editContext.tipo === "ocr") {
      const p = ocrResultados[editContext.index];
      if (!p) return;
      p.titulo = document.getElementById("edit-titulo").value.trim();
      p.coorActual = document.getElementById("edit-coor-actual").value.trim();
      p.coorModificada = document.getElementById("edit-coor-modificada").value.trim();
      p.estado = document.getElementById("edit-estado").value.trim();
      const imgInput = document.getElementById("edit-img").value.trim();
      p.img = imgInput.startsWith("https://lh3.googleusercontent.com") ? imgInput : "";
      document.getElementById("modal-editar").classList.remove("visible");
      mostrarResultadosOCR();
      return;
    }

    if (!editContext.idFila) return alert("⚠️ No hay propuesta seleccionada.");
    const payload = {
      action: "editarWayfarer",
      idFila: editContext.idFila,
      nick: document.getElementById("editar-nick").value.trim(),
      tipo: document.getElementById("edit-tipo").value,
      estado: document.getElementById("edit-estado").value,
      titulo: document.getElementById("edit-titulo").value.trim(),
      img: document.getElementById("edit-img").value.trim(),
      direccion: document.getElementById("edit-direccion").value.trim(),
      coorActual: document.getElementById("edit-coor-actual").value.trim(),
      coorModificada: document.getElementById("edit-coor-modificada").value.trim()
    };
    if (payload.img.includes("googleusercontent.com")) {
      payload.img = payload.img.split("/").pop().split("=")[0];
    }

    try {
      const fd = new FormData();
      fd.append("data", JSON.stringify(payload));
      const res = await fetch(DEPLOY_URL, { method: "POST", body: fd });
      const out = await res.json();
      if (!out.ok) throw new Error(out.mensaje || "Error en servidor");
      alert("✅ Cambios guardados correctamente.");
      document.getElementById("modal-editar").classList.remove("visible");
      cargarTarjetas(true);
    } catch (err) {
      alert("❌ No se pudo guardar: " + err.message);
    }
  });

  // -----------------------------
  // OCR — flujo local (tarjetas estilo OCR)
  // -----------------------------
  let ocrImages = [];
  let ocrResultados = [];

  document.getElementById("ocr-input")?.addEventListener("change", function () {
    const files = Array.from(this.files);
    ocrImages.push(...files);
    this.value = "";
    actualizarPreview();
  });

  function actualizarPreview() {
    const preview = document.getElementById("ocr-preview");
    if (!preview) return;
    preview.innerHTML = "";
    ocrImages.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        const div = document.createElement("div");
        div.classList.add("ocr-item");
        div.innerHTML = `<img src="${e.target.result}"><button class="btn-delete" data-index="${index}"></button>`;
        preview.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  }

  document.getElementById("ocr-preview")?.addEventListener("click", function (e) {
    if (!e.target.classList.contains("btn-delete")) return;
    const index = e.target.getAttribute("data-index");
    ocrImages.splice(index, 1);
    actualizarPreview();
  });

  function fileToBase64(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  function extraerTitulo(rawText) {
    let text = rawText
      .replace(/\s+/g, " ")
      .replace(/más reciente.*?modificación/gi, "")
      .replace(/criterios|perfil|enviar|contribuciones|ayuda/gi, "")
      .trim();
    const t1 = text.match(/modificaci[oó]n de la ubicaci[oó]n para ([\w\sáéíóúñ.,]+)/i);
    if (t1) return formatearTitulo(t1[1]);
    const t2 = text.match(/^([\w\sáéíóúñ.,]{6,80})\s+(modificaci[oó]n|en votaci[oó]n|20\d{2})/i);
    if (t2) return formatearTitulo(t2[1]);
    return formatearTitulo(rawText);
  }
  function formatearTitulo(t) {
    return t.trim().replace(/\s+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
  function extraerImagenURL(rawText) {
    const regex = /(https:\/\/lh3\.googleusercontent\.com\/[^\s"']+)/i;
    const match = rawText.match(regex);
    return match ? match[0] : "";
  }

  document.getElementById("btn-analizar-ocr")?.addEventListener("click", async () => {
    if (ocrImages.length === 0) return alert("Selecciona capturas primero.");
    const cont = document.getElementById("resultado-ocr");
    if (cont) cont.innerHTML = `<p>🔍 Analizando capturas...</p>`;

    ocrResultados = [];
    let idx = 0;
    for (const file of ocrImages) {
      idx++;
      if (cont) cont.innerHTML = `<p>🕵️ Analizando ${idx}/${ocrImages.length}...</p>`;
      const dataUrl = await fileToBase64(file);
      const { data: { text } } = await Tesseract.recognize(dataUrl, "spa");
      const raw = text.toLowerCase();

      let tipo = "";
      if (raw.includes("modificación de ubicación")) tipo = "Movimiento de Pokeparada";
      else if (raw.includes("propuesta de foto")) tipo = "Propuesta de Foto";
      else if (raw.includes("propuesta de wayspot") || raw.includes("propuesta de poképarada")) tipo = "Propuesta de Pokeparada";
      else continue;

      const estado = raw.includes("en votaci") ? "En Votacion" : "En Cola";
      const titulo = extraerTitulo(text);
      const coordRegex = /(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/g;
      const coords = [...raw.matchAll(coordRegex)].map(c => `${c[1]}, ${c[2]}`);
      const coorActual = coords[0] || "";
      const coorModificada = coords[1] || "";
      const imgURL = extraerImagenURL(text);
      const fechaMatch = raw.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
      const fecha = fechaMatch ? fechaMatch[1] : new Date().toISOString().split("T")[0];

      const repetida = ocrResultados.some(p => p.titulo === titulo && p.tipo === tipo);
      if (!repetida) {
        ocrResultados.push({ titulo, tipo, estado, coorActual, coorModificada, img: imgURL || "", fecha });
      }
    }

    if (!cont) return;
    cont.innerHTML = "";
    if (ocrResultados.length === 0) cont.innerHTML = `<p>❌ No se detectaron propuestas válidas.</p>`;
    else mostrarResultadosOCR();
  });

  function mostrarResultadosOCR() {
    const cont = document.getElementById("resultado-ocr");
    if (!cont) return;
    cont.innerHTML = "";
    ocrResultados.forEach((p, i) => {
      let coords = "(Sin coordenadas)";
if (p.coorActual && p.coorModificada) {
  coords = `📍 ${p.coorActual} → ${p.coorModificada}`;
} else if (p.coorActual) {
  coords = `📍 ${p.coorActual}`;
} else if (p.coorModificada) {
  coords = `📍 ${p.coorModificada}`;
}

      cont.innerHTML += `
        <div class="ocr-card">
          <img src="${p.img && p.img.startsWith('http') ? p.img : 'assets/sinimagenpokeparada.png'}" class="ocr-img">
          <div class="ocr-info">
            <div class="titulo">${p.titulo}</div>
            <div class="tipo">${p.tipo}</div>
            <div class="coord">${coords}</div>
            <div class="estado">${p.estado} – ${p.fecha}</div>
          </div>
          <div class="ocr-actions">
            <button class="btn-editar-ocr" data-index="${i}">✏ Editar</button>
            <button class="btn-eliminar-ocr" data-index="${i}">🗑 Eliminar</button>
          </div>
        </div>
      `;
    });
  }

  // Editar / Eliminar tarjetas OCR (local)
  document.body.addEventListener("click", function (e) {
    if (e.target.classList.contains("btn-editar-ocr")) {
      const index = Number(e.target.getAttribute("data-index"));
      const p = ocrResultados[index];
      if (!p) return;

      editContext = { tipo: "ocr", index };
      const modal = document.getElementById("modal-editar");
      modal.classList.add("visible");

      // Mostrar todo excepto Nick
      document.querySelectorAll("#modal-editar .form-group, .modal-editar-botones").forEach(el => el.style.display = "block");
      document.getElementById("editar-nick").style.display = "none";
      document.getElementById("btn-validar-nick").style.display = "none";

      document.getElementById("edit-titulo").value = p.titulo || "";
      document.getElementById("edit-coor-actual").value = p.coorActual || "";
      document.getElementById("edit-coor-modificada").value = p.coorModificada || "";
      document.getElementById("edit-estado").value = p.estado || "En Cola";
      if (p.img.startsWith("https://lh3.googleusercontent.com")) {
        document.getElementById("edit-img").value = p.img;
      } else {
        document.getElementById("edit-img").value = "";
      }

      const tipoOCR = {
        "Movimiento de Pokeparada": "mover",
        "Propuesta con Reubicación": "reubicacion",
        "Propuesta de Pokeparada": "nueva",
        "Propuesta de Foto": "foto"
      }[p.tipo] || "nueva";
      document.getElementById("edit-tipo").value = tipoOCR;
      toggleCamposPorTipo(tipoOCR);
    }

    if (e.target.classList.contains("btn-eliminar-ocr")) {
      const index = Number(e.target.getAttribute("data-index"));
      ocrResultados.splice(index, 1);
      mostrarResultadosOCR();
    }
  });

  // -----------------------------
  // BOOKMARKLET → Import automático al abrir la web
  // Muestra como tarjetas OCR (lo que querías)
  // -----------------------------


  // 📥 BOTÓN PARA IMPORTAR LOS DATOS DEL BOOKMARKLET
// 📥 Botón para importar del bookmarklet y mostrar como OCR
document.getElementById("btn-importar-bookmarklet")?.addEventListener("click", async () => {
  try {
    const clipboardText = await navigator.clipboard.readText();
    if (!clipboardText) return alert("⚠ No hay datos en el portapapeles.");

    const nuevas = JSON.parse(clipboardText);
    if (!Array.isArray(nuevas) || nuevas.length === 0) return alert("⚠ No hay propuestas válidas.");

    let almacenadas = getLocalPropuestas();
    let agregadas = 0;

    nuevas.forEach(p => {
      const yaExiste = almacenadas.some(x => x.titulo === p.titulo && x.fecha === p.fecha);
      if (!yaExiste) {
        almacenadas.push({ ...p, subido: false });
        agregadas++;
      }
    });

    saveLocalPropuestas(almacenadas);

    // ✅ Cargar en OCR sólo las que NO se han subido
    ocrResultados = almacenadas.filter(p => !p.subido);

    // ✅ Mostrar tarjetas en pantalla
    if (typeof mostrarResultadosOCR === "function") {
      mostrarResultadosOCR();
    }

    alert(`✅ ${agregadas} nuevas propuestas importadas`);
  } catch (err) {
    console.error(err);
    alert("❌ Error importando datos.");
  }
});


  // -----------------------------
  // Boot inicial
  // -----------------------------
  cargarTarjetas();       // Carga de hoja (vista gestión)
  loadGoogleMapsApi?.();  // precarga Maps si tienes la función en main.js

  console.log("tab2_manage.js limpio + Bookmarklet + OCR listo ✅");
};
