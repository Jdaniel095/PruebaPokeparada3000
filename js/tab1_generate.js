// ===============================
// js/tab1_generate.js
// ===============================

// -----------------------------
// 🌟 Configuración global
// -----------------------------
var testFiles = [ // 👈 'const' ahora es 'var'
  { id: "test1", name: "Prueba 1", thumbnailLink: "..." },
  // ...
];

var files = []; // 👈 'let' ahora es 'var'
var selected = new Set(); // 👈 'let' ahora es 'var'
var accesoSelected = new Set(); // 👈 'let' ahora es 'var'
var nombreSesionActual = ""; // 👈 'let' ahora es 'var'

var DEPLOY_URL = window.APP_CONFIG?.SHEET_URL;



// -----------------------------
// 🚀 Inicializador de la pestaña
// -----------------------------
window.initTab1 = function () {
  console.log("🧩 Pestaña Generar iniciada");
    // ✅ Reiniciar eventos de sección 5 al volver a Tab1
  delegadosInstaladosSeccion5 = false;
  setupToggles();
  setupDriveFunctions();
  setupSesionFunctions(); 
  initSeccion3Ubicaciones(); 
  initSeccion4Propuestas(); // 👈 nueva línea
  initSeccion5Resultados(); // 👈 activa la Sección 5
};

// -----------------------------
// 🟦 Toggles de secciones
// -----------------------------
function setupToggles() {
  const container = document.getElementById("tab-content");
  if (!container) return;
  const toggles = container.querySelectorAll(".toggle-btn");

  toggles.forEach(btn => {
    const card = btn.closest(".section-card");
    const content = card.querySelector(".section-content");
    content.style.display = content.style.display || "block";
    btn.textContent = "−";

    btn.addEventListener("click", () => {
      const isHidden = window.getComputedStyle(content).display === "none";
      content.style.display = isHidden ? "block" : "none";
      btn.textContent = isHidden ? "−" : "+";
    });
  });
}

// -----------------------------
// 🟨 Drive: listado y selección
// -----------------------------
function setupDriveFunctions() {
  const { API_KEY, DRIVE_FOLDER_ID } = window.APP_CONFIG;

  async function listDriveFiles() {
    let driveFiles = [];
    try {
      const url = `https://www.googleapis.com/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents&key=${API_KEY}&fields=files(id,name,thumbnailLink,webContentLink)`;
      const res = await fetch(url);
      const data = await res.json();
      console.log("🧾 Data completa recibida:", data);

      driveFiles = data.files || [];
    } catch (err) {
      console.warn("⚠️ No se pudo conectar a Drive, usando imágenes demo");
    }

    

    const uniqueFiles = {};
    [...driveFiles, ...testFiles].forEach(f => {
      if (!uniqueFiles[f.name]) uniqueFiles[f.name] = f;
    });
    files = Object.values(uniqueFiles);
    renderFiles();
  }

  function renderFiles() {
    const cont = document.getElementById("filesList");
    if (!cont) return;
    cont.innerHTML = "";

    files.forEach((f, i) => {
      const isSel = selected.has(f.id);
      const isAcceso = accesoSelected.has(f.id);
      const thumb = f.thumbnailLink || "";

      const card = document.createElement("div");
      card.classList.add("drive-thumb");

      card.innerHTML = `
        <div class="file-wrapper left">
          <input type="checkbox" id="poke-${f.id}" class="file-toggle" ${isSel ? "checked" : ""}/>
          <label for="poke-${f.id}" class="file-check">✓</label>
        </div>
        <div class="file-wrapper right">
          <input type="checkbox" id="acceso-${f.id}" class="file-toggle" ${isAcceso ? "checked" : ""}/>
          <label for="acceso-${f.id}" class="file-check acceso">✓</label>
        </div>
        <img src="${thumb}" alt="${f.name}">
        <div class="thumb-num">#${i + 1}</div>
      `;

      card.querySelector(`#poke-${f.id}`).addEventListener("change", e => {
        if (e.target.checked) {
          selected.add(f.id);
          accesoSelected.delete(f.id);
        } else {
          selected.delete(f.id);
        }
        renderFiles();
      });

      card.querySelector(`#acceso-${f.id}`).addEventListener("change", e => {
        if (e.target.checked) {
          accesoSelected.add(f.id);
          selected.delete(f.id);
        } else {
          accesoSelected.delete(f.id);
        }
        renderFiles();
      });

      cont.appendChild(card);
    });

    const spans = document.querySelectorAll("#filesCounter span");
    if (spans.length >= 3) {
      spans[0].textContent = `Total: ${files.length}`;
      spans[1].textContent = `Poképaradas: ${selected.size}`;
      spans[2].textContent = `Accesos: ${accesoSelected.size}`;
    }
  }

  document.getElementById("btnRefresh")?.addEventListener("click", listDriveFiles);
  document.getElementById("btnSelectAll")?.addEventListener("click", () => { files.forEach(f => selected.add(f.id)); renderFiles(); });
  document.getElementById("btnClearPoke")?.addEventListener("click", () => { selected.clear(); renderFiles(); });
  document.getElementById("btnClearAcceso")?.addEventListener("click", () => { accesoSelected.clear(); renderFiles(); });
  document.getElementById("btnClearAll")?.addEventListener("click", () => { selected.clear(); accesoSelected.clear(); renderFiles(); });

  document.getElementById("btnGuardarFotos")?.addEventListener("click", async () => {
    const nombreSesion = document.getElementById("inputNombreSesion")?.value.trim();
    if (!nombreSesion) return alert("⚠️ Ingresa un nombre de sesión antes de guardar.");
    if (selected.size === 0 && accesoSelected.size === 0) return alert("⚠️ No hay imágenes seleccionadas para guardar.");

    const pares = Array.from(selected).map((p, i) => ({
      NombreSesion: nombreSesion,
      NumeroPropuesta: i + 1,
      FotoPrincipalID: p,
      FotoAccesoID: Array.from(accesoSelected)[i] || ""
    }));

    try {
      const formData = new FormData();
      formData.append("data", JSON.stringify({ pares }));

      const res = await fetch(window.APP_CONFIG.SHEET_URL, { method: "POST", body: formData });
      const resultText = await res.text();
      let result;
      try { result = JSON.parse(resultText); } catch { result = { ok: false, mensaje: "Respuesta no válida del servidor" }; }
      alert(result.ok ? `✅ Guardado exitoso: ${result.mensaje}` : `⚠️ Error al guardar: ${result.mensaje}`);

      if (result.ok) {
        await actualizarCollageDespuesDeGuardar();
        selected.clear();
        accesoSelected.clear();
        renderFiles();
      }
    } catch (err) {
      console.error("❌ Error al enviar a Sheets:", err);
      alert("❌ No se pudo conectar al servidor de Google Sheets.");
    }
  });

  listDriveFiles();
}

// -----------------------------
// 💾 Manejo de Sesión Temporal
// -----------------------------
function setupSesionFunctions() {
  const inputSesion = document.getElementById("inputNombreSesion");
  const btnGuardarSesion = document.getElementById("btnGuardarSesion");
  if (!inputSesion || !btnGuardarSesion) return;

btnGuardarSesion.addEventListener("click", () => {
  const nombre = inputSesion.value.trim();
  if (!nombre) return alert("⚠️ Ingresa un nombre para la sesión antes de guardar.");

  // 👇 Cierra el teclado antes del alert
  inputSesion.blur();  

  nombreSesionActual = nombre;
  localStorage.setItem("nombreSesionTemporal", nombre);

  // 👇 Delay evita freeze en Safari iOS
  setTimeout(() => {
    alert(`✅ Sesión guardada: "${nombreSesionActual}"`);
  }, 150);
});


  const saved = localStorage.getItem("nombreSesionTemporal");
  if (saved) {
    nombreSesionActual = saved;
    inputSesion.value = saved;
  }
}

// -----------------------------
// 🎨 Generador de collage automático
// -----------------------------
async function generarCollageAutomatico(nombreSesion) {
  if (!nombreSesion) return;
  const preview = document.getElementById("collagePreview");
  const btnCollage = document.getElementById("btnGenerarCollage");

  preview.innerHTML = `<div class="collage-loader"><div class="pokeball-spinner"></div><p>Generando collage... por favor espera</p></div>`;
  if (btnCollage) { btnCollage.disabled = true; btnCollage.textContent = "⏳ Generando..."; }

  try {
    const resp = await fetch(`${DEPLOY_URL}?action=getFotosSesion&nombreSesion=${encodeURIComponent(nombreSesion)}`);
    const data = await resp.json();
    const fotos = data.fotos || [];
    if (!data.ok || fotos.length === 0) {
      preview.innerHTML = "<p>⚠️ No hay fotos aún para esta sesión.</p>";
      btnCollage.disabled = false;
      btnCollage.textContent = "🎨 Generar Collage";
      return;
    }

    const fotosUnicas = Array.from(new Map(fotos.map(f => [f.FotoPrincipalID, f])).values())
      .sort((a, b) => (a.NumeroPropuesta || 0) - (b.NumeroPropuesta || 0));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const size = 200;
    const cols = 4;
    const rows = Math.ceil(fotosUnicas.length / cols);
    canvas.width = cols * size;
    canvas.height = rows * size;

    for (let index = 0; index < fotosUnicas.length; index++) {
      const foto = fotosUnicas[index];
      const id = foto.FotoPrincipalID;
      const numero = foto.NumeroPropuesta || index + 1;
      const url = `https://lh3.googleusercontent.com/d/${id}=s800`;

      try {
        const img = await cargarImagen(url);
        const x = (index % cols) * size;
        const y = Math.floor(index / cols) * size;
        ctx.drawImage(img, x, y, size, size);
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(x + size - 40, y + size - 30, 35, 25);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px Arial";
        ctx.fillText(numero, x + size - 30, y + size - 12);
      } catch {
        const x = (index % cols) * size;
        const y = Math.floor(index / cols) * size;
        ctx.fillStyle = "#ccc";
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = "#000";
        ctx.fillText("No disponible", x + 20, y + 100);
      }
    }

    preview.innerHTML = "";
    const imgPreview = document.createElement("img");
    imgPreview.src = canvas.toDataURL("image/png");
    imgPreview.classList.add("collage-result");
    preview.appendChild(imgPreview);

    const btnDescargar = document.createElement("button");
    btnDescargar.textContent = "💾 Descargar Collage";
    btnDescargar.className = "primary";
    btnDescargar.style.marginTop = "10px";
    btnDescargar.onclick = () => { const a = document.createElement("a"); a.href = imgPreview.src; a.download = `collage_${nombreSesion}.png`; a.click(); };
    preview.appendChild(btnDescargar);

  } catch (err) {
    console.error("❌ Error generando collage automático:", err);
    preview.innerHTML = `<p style="color:red;">❌ Error al generar collage.</p>`;
  }

  btnCollage.disabled = false;
  btnCollage.textContent = "🎨 Generar Collage";
}

async function actualizarCollageDespuesDeGuardar() {
  const nombreSesion = nombreSesionActual || document.getElementById("inputNombreSesion")?.value.trim();
  if (nombreSesion) await generarCollageAutomatico(nombreSesion);
}

function cargarImagen(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// ===================================================
// 📍 SECCIÓN 3 — Guardar y mostrar ubicaciones
// ===================================================
window.initSeccion3Ubicaciones = function () {
  const btn = document.getElementById("btnGuardarCoordenada");
  const cont = document.getElementById("ubicacionesList");
  if (!btn || !cont) return;

  // 🧹 Limpia ubicaciones visuales y recarga cuando cambia de sesión
  document.addEventListener("cambioSesion", () => {
    limpiarUbicacionesVisual();
    cargarUbicacionesGuardadas(cont);
  });

  // 📍 Guardar nueva coordenada
  btn.addEventListener("click", async () => {
    if (!nombreSesionActual) return alert("⚠️ Primero debes guardar un nombre de sesión antes de guardar coordenadas.");
    if (!navigator.geolocation) return alert("❌ Tu navegador no soporta geolocalización.");

    // 🔹 Consultar cuántas ubicaciones tiene esta sesión
    const res = await fetch(`${DEPLOY_URL}?action=getUbicaciones&nombreSesion=${encodeURIComponent(nombreSesionActual)}`);
    const data = await res.json();
    const countSesion = data.ok && Array.isArray(data.ubicaciones) ? data.ubicaciones.length : 0;

    navigator.geolocation.getCurrentPosition(async pos => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      const hora = new Date().toLocaleString();
      let direccion = "Obteniendo dirección...";
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        const d = await resp.json();
        direccion = d.display_name || "Dirección no encontrada";
      } catch { direccion = "No disponible"; }

      const ubicacion = {
        NombreSesion: nombreSesionActual,
        NumeroPropuesta: countSesion + 1, // ✅ numeración por sesión
        Lat: lat,
        Lng: lng,
        Direccion: direccion,
        CooTitulo: "",
        Hora: hora
      };

      agregarUbicacionVisual(ubicacion);
      await guardarUbicacionEnSheet(ubicacion);
    }, err => alert("❌ No se pudo obtener la ubicación: " + err.message));
  });

  // 🔄 Cargar ubicaciones al iniciar
  limpiarUbicacionesVisual();
  cargarUbicacionesGuardadas(cont);
};

// 🧽 Limpia las ubicaciones de la interfaz
function limpiarUbicacionesVisual() {
  const cont = document.getElementById("ubicacionesList");
  if (cont) cont.innerHTML = "";
}

async function guardarUbicacionEnSheet(u) {
  try {
    const formData = new FormData();
    formData.append("data", JSON.stringify({ ubicaciones: [u], action: "guardarUbicacion" }));
    const res = await fetch(DEPLOY_URL, { method: "POST", body: formData });
    console.log("📩 Respuesta guardado ubicación:", await res.text());
  } catch (err) {
    console.error("❌ Error al guardar ubicación:", err);
  }
}

// Función para crear visualmente la ubicación y manejar eventos
function agregarUbicacionVisual(u, numeroPropuesta = null) {
  const cont = document.getElementById("ubicacionesList");
  if (!cont) return;
  const num = numeroPropuesta || document.querySelectorAll(".ubicacion-item").length + 1;

  const item = document.createElement("div");
  item.className = "ubicacion-item";
  item.style.display = "flex";
  item.style.alignItems = "stretch";
  item.style.gap = "10px";
  item.style.border = "1px solid #444";
  item.style.padding = "10px";
  item.style.borderRadius = "10px";
  item.style.background = "#0e2239";

  item.innerHTML = `
    <div style="flex:1;max-width:150px;cursor:pointer;">
      <img src="https://maps.googleapis.com/maps/api/staticmap?center=${u.Lat},${u.Lng}&zoom=17&size=150x150&maptype=satellite&markers=color:red%7C${u.Lat},${u.Lng}&key=${window.APP_CONFIG.API_KEY}"
           alt="Mapa miniatura" style="border-radius:8px;width:100%;height:auto;">
    </div>
    <div style="flex:2;">
      <div><b>Propuesta #${num}</b> <span class="titulo-coo" style="color:#aaa;">${u.CooTitulo ? `— ${u.CooTitulo}` : ""}</span></div>
      <div>${u.Lat}, ${u.Lng}</div>
      <div style="font-size:0.9em;color:#ccc;">${u.Direccion}</div>
      <div style="font-size:0.8em;color:#999;">Guardado: ${u.Hora}</div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
      <button class="editar-titulo secondary">✏️ Título</button>
      <button class="ordenar secondary">🔢 Ordenar</button>
      <button class="eliminar poke">🗑️ Eliminar</button>
    </div>
  `;

  // Click en miniatura para modal de mapa
  const img = item.querySelector("img");
  img.addEventListener("click", () => {
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = 0;
    modal.style.left = 0;
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.background = "rgba(0,0,0,0.8)";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = 9999;

    modal.innerHTML = `
      <div style="position:relative;width:90%;height:80%;border-radius:12px;background:#fff;">
        <iframe src="https://maps.google.com/maps?q=${u.Lat},${u.Lng}&t=k&z=18&output=embed&disableDefaultUI=1&controls=0&iwloc="
          style="width:100%;height:100%;border:none;border-radius:12px;"></iframe>
        <button id="btnCerrarModal" style="position:absolute;top:10px;right:10px;padding:6px 10px;background:#fff;border:none;border-radius:4px;cursor:pointer;z-index:1000;">❌ Cerrar</button>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector("#btnCerrarModal").addEventListener("click", () => modal.remove());
  });

  // Editar título
  item.querySelector(".editar-titulo").addEventListener("click", () => {
    const nuevoTitulo = prompt("📝 Ingresa un título para esta coordenada:", u.CooTitulo || "");
    if (nuevoTitulo !== null) {
      u.CooTitulo = nuevoTitulo;
      item.querySelector(".titulo-coo").textContent = `— ${nuevoTitulo}`;
      guardarUbicacionEnSheet(u);
    }
  });

  // Eliminar
  item.querySelector(".eliminar").addEventListener("click", async () => {
    if (!confirm("¿Eliminar esta ubicación?")) return;
    item.remove();
    try {
      const formData = new FormData();
      formData.append("data", JSON.stringify({
        action: "eliminarUbicacion",
        NombreSesion: u.NombreSesion,
        NumeroPropuesta: u.NumeroPropuesta
      }));
      await fetch(DEPLOY_URL, { method: "POST", body: formData });
    } catch (err) {
      console.error("❌ Error al eliminar ubicación:", err);
    }
  });

  cont.appendChild(item);
}

// Reordenar propuestas (si se quiere usar)
function actualizarNumerosPropuestas() {
  document.querySelectorAll(".ubicacion-item").forEach((item, i) => {
    const label = item.querySelector("b");
    if (label) label.textContent = `Propuesta #${i + 1}`;
  });
}

async function cargarUbicacionesGuardadas(cont) {
  if (!nombreSesionActual) return;
  try {
    const res = await fetch(`${DEPLOY_URL}?action=getUbicaciones&nombreSesion=${encodeURIComponent(nombreSesionActual)}`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.ubicaciones)) {
      data.ubicaciones.forEach((u, i) => agregarUbicacionVisual(u, i + 1));
    }
  } catch (err) {
    console.error("⚠️ Error cargando ubicaciones:", err);
  }
}

// ===================================================
// 📋 SECCIÓN 4 — Pegar y guardar propuestas (Manual y IA)
// ===================================================
window.initSeccion4Propuestas = function () {
  // Referencias a elementos
  const input = document.getElementById("inputPropuestas");
  const btnGuardarManual = document.getElementById("btnGuardarPropuestasManual"); // Botón renombrado
  const btnGenerarIA = document.getElementById("btnGenerarConGemini");
  const lista = document.getElementById("listaPropuestas");
  
  const radioManual = document.getElementById("modoManual");
  const radioGemini = document.getElementById("modoGemini");
  const contManual = document.getElementById("contenedorModoManual");
  const contGemini = document.getElementById("contenedorModoGemini");

  if (!btnGuardarManual || !btnGenerarIA || !lista || !radioManual || !radioGemini) return;

  // --- Manejadores de Toggles (Radio Buttons) ---
  radioManual.addEventListener("change", () => {
    if (radioManual.checked) {
      contManual.style.display = "block";
      contGemini.style.display = "none";
    }
  });
  radioGemini.addEventListener("change", () => {
    if (radioGemini.checked) {
      contManual.style.display = "none";
      contGemini.style.display = "block";
    }
  });

  // --- 1. Lógica para Guardado Manual (tu código original) ---
  btnGuardarManual.addEventListener("click", async () => {
    const texto = input.value.trim();
    if (!texto) return alert("⚠️ Pega al menos una propuesta.");
    if (!nombreSesionActual) return alert("⚠️ Debes guardar una sesión primero.");

    const bloques = texto.split(/🖼️\s*Propuesta\s*\d+/i).filter(b => b.trim() !== "");
    const numeros = [...texto.matchAll(/🖼️\s*Propuesta\s*(\d+)/gi)].map(m => parseInt(m[1]));

    if (bloques.length === 0) {
      alert("⚠️ No se encontraron propuestas con el formato correcto.");
      return;
    }

    const propuestas = bloques.map((bloque, i) => ({
      NombreSesion: nombreSesionActual,
      NumeroPropuesta: numeros[i] || i + 1,
      Titulo: (bloque.match(/Título:\s*([\s\S]*?)(?=\nDescripción:|$)/i)?.[1] || "").trim(),
      Descripcion: (bloque.match(/Descripción:\s*([\s\S]*?)(?=\nDescripción para Wayfarer:|$)/i)?.[1] || "").trim(),
      Wayfarer: (bloque.match(/Descripción para Wayfarer:\s*([\s\S]*)/i)?.[1] || "").trim()
    }));
    
    // Llama a la función de guardado
    await enviarPropuestasAGoogleSheet(propuestas, lista);
  });

  // --- 2. Lógica para Generar con IA (NUEVO) ---
  btnGenerarIA.addEventListener("click", async () => {
    if (!nombreSesionActual) return alert("⚠️ Debes guardar una sesión primero.");
    
    // 1. Obtener la imagen del collage
    const collageImg = document.querySelector("#collagePreview .collage-result");
    if (!collageImg) {
      return alert("⚠️ No se ha generado un collage en la Sección 2. Por favor, genera el collage primero.");
    }
    
    // 2. Obtener la imagen en Base64 (quitamos el prefijo 'data:image/png;base64,')
    const base64ImageData = collageImg.src.split(',')[1];

      // ✅ 3. Obtener el orden real de las imágenes (según el collage)
  let fotosOrden = [];
  try {
    // Llamamos al backend para recuperar las fotos reales usadas en ese collage
    const respFotos = await fetch(`${DEPLOY_URL}?action=getFotosSesion&nombreSesion=${encodeURIComponent(nombreSesionActual)}`);
    const dataFotos = await respFotos.json();

    if (dataFotos.ok && Array.isArray(dataFotos.fotos)) {
      // Orden real según NumeroPropuesta (como se dibujó en el collage)
      fotosOrden = dataFotos.fotos
        .sort((a, b) => (a.NumeroPropuesta || 0) - (b.NumeroPropuesta || 0))
        .map(f => f.FotoPrincipalID);
    }
  } catch (e) {
    console.warn("⚠️ No se pudieron obtener los IDs en orden. IA usará posición.", e);
  }

  // ✅ TEST: Mostrar cómo se están enlazando imágenes y filas
console.log("🟦 TEST — ORDEN DE IMÁGENES EN COLLAGE (fotosOrden):");
console.table(fotosOrden);

try {
  const resp = await fetch(`${DEPLOY_URL}?action=getPropuestasSesion&nombreSesion=${encodeURIComponent(nombreSesionActual)}`);
  const dataSheet = await resp.json();
  console.log("🟨 TEST — FILAS EN SHEET (con FotoPrincipalID):");
  
  // Solo mostramos fotoID + número para ver si están corridas
  const debugSheet = dataSheet.registros.map(r => ({
    numero: r.numero,
    FotoPrincipalID: r.FotoPrincipalID,
    titulo: r.titulo
  }));
  console.table(debugSheet);
} catch (error) {
  console.error("❌ Error mostrando test de fotos:", error);
}

    
    // 3. Obtener el prompt exacto que pediste
    const promptTexto = `Quiero que siempre me entregues las propuestas con este formato exacto, sin agregar explicaciones, emojis extra ni texto adicional fuera del formato.
Cada propuesta debe seguir este modelo:

🖼️ Propuesta 1
Título: [nombre del lugar]
Descripción: [explicación del lugar en 2-3 líneas, lenguaje natural y descriptivo]
Descripción para Wayfarer: [versión resumida orientada a jugadores, sin bromas ni ironía]

🖼️ Propuesta 2
Título: [...]
Descripción: [...]
Descripción para Wayfarer: [...]

Y así sucesivamente.
No uses numeración romana ni símbolos distintos.
Cada campo debe comenzar exactamente con:
“Título:”, “Descripción:” y “Descripción para Wayfarer:”
con mayúsculas, acentos y formato idéntico.
No incluyas ningún otro texto ni notas adicionales.`;
    
    // 4. Mostrar estado de carga
    lista.innerHTML = `<div class="collage-loader"><div class="pokeball-spinner"></div><p>🤖 Gemini está analizando el collage y generando las propuestas...</p></div>`;
    btnGenerarIA.disabled = true;
    btnGenerarIA.textContent = "⏳ Procesando...";

    try {
      // 5. Enviar al backend (Google Apps Script)
      const formData = new FormData();
      formData.append("data", JSON.stringify({
  action: "generarPropuestasConIA",
  NombreSesion: nombreSesionActual,
  imageData: base64ImageData,
  prompt: promptTexto,
  fotosOrden: fotosOrden // ✅ Se envía el orden real de fotos
}));

      const res = await fetch(DEPLOY_URL, { method: "POST", body: formData });
      const resultText = await res.text();
      let result;
      try { result = JSON.parse(resultText); } catch { result = { ok: false, mensaje: "Respuesta inválida del servidor" }; }

      if (result.ok) {
        lista.innerHTML = `<div style="background:#0e2239;padding:10px;border-radius:8px;color:#8ff;">
          ✅ ${result.mensaje}
        </div>`;
        // Activar Sección 5
        activarSeccion5(result.totalPropuestas || 0);
      } else {
        throw new Error(result.mensaje || "Error desconocido del backend");
      }

    } catch (err) {
      console.error("❌ Error al generar con IA:", err);
      lista.innerHTML = `<p style="color:red;">❌ Error al conectar con el servicio de IA: ${err.message}</p>`;
    }
    
    btnGenerarIA.disabled = false;
    btnGenerarIA.textContent = "🤖 Generar y Guardar con IA";
  });
};


// --- 3. Función Reutilizable para Guardar Propuestas (Refactorización de tu código) ---
// (Pega esto DESPUÉS de tu función initSeccion4Propuestas)
async function enviarPropuestasAGoogleSheet(propuestasArray, listaElement) {
  if (!propuestasArray || propuestasArray.length === 0) return;
  
  listaElement.innerHTML = `<div class="collage-loader"><div class="pokeball-spinner"></div><p>Guardando propuestas en Google Sheets...</p></div>`;

  try {
    const formData = new FormData();
    formData.append("data", JSON.stringify({ 
      propuestas: propuestasArray, 
      action: "guardarPropuestas" // Acción de guardado manual
    }));

    const res = await fetch(DEPLOY_URL, { method: "POST", body: formData });
    const resultText = await res.text();
    let result;
    try { result = JSON.parse(resultText); } catch { result = { ok: false, mensaje: "Respuesta inválida" }; }

    if (result.ok) {
      listaElement.innerHTML = `<div style="background:#0e2239;padding:10px;border-radius:8px;color:#8ff;">
        ${result.mensaje}
      </div>`;
      // Activar Sección 5
      activarSeccion5(propuestasArray.length);
    } else {
      throw new Error(result.mensaje);
    }
  } catch (err) {
    console.error("❌ Error al guardar propuestas:", err);
    listaElement.innerHTML = `<p style="color:red;">❌ No se pudo guardar las propuestas: ${err.message}</p>`;
  }
}

// --- 4. Función Reutilizable para Activar Sección 5 ---

function activarSeccion5(totalPropuestas) {
  const seccion5 = document.querySelector("#seccion5");
  if (seccion5) {
    seccion5.style.display = "block";
    const btnToggle = seccion5.querySelector(".toggle-btn");
    const content = seccion5.querySelector(".section-content");
    if(btnToggle) btnToggle.textContent = "−"; // Expandir
    if(content) content.style.display = "block"; // Expandir

    const contador = document.querySelector("#contadorPropuestas");
    if (contador) contador.textContent = `Total de propuestas: ${totalPropuestas}`;
  }
}

// ===================================================
// 🧩 SECCIÓN 5 — Mostrar Propuestas (estilo pestaña 2 + extras)
// ===================================================
window.initSeccion5Resultados = function () {
  const btnGenerar = document.getElementById("btnGenerarPropuestas");
  if (!btnGenerar) return;

  // 1) Handlers delegados (una sola vez)
  instalarDelegadosSeccion5();

  btnGenerar.addEventListener("click", async () => {
    if (!nombreSesionActual) return alert("⚠️ Primero debes seleccionar/guardar una sesión.");

    // Minimiza otras secciones
    document.querySelectorAll(".section-content").forEach(c => (c.style.display = "none"));
    document.querySelectorAll(".toggle-btn").forEach(b => (b.textContent = "+"));

    btnGenerar.disabled = true;
    btnGenerar.textContent = "⏳ Generando...";

    const cont = document.getElementById("resultadosContainer");
    const contador = document.getElementById("contadorPropuestas");
    cont.innerHTML = `<p style="color:#8ff;">Cargando datos desde la base de datos...</p>`;

    try {
      const res = await fetch(`${DEPLOY_URL}?action=getPropuestasSesion&nombreSesion=${encodeURIComponent(nombreSesionActual)}`);
      const data = await res.json();

      if (!data.ok || !Array.isArray(data.registros) || data.registros.length === 0) {
        cont.innerHTML = "<p style='color:orange;'>⚠️ No hay datos registrados para esta sesión.</p>";
        btnGenerar.disabled = false;
        btnGenerar.textContent = "⚙️ Mostrar Propuestas";
        return;
      }

      contador.textContent = `Total de propuestas: ${data.registros.length}`;
      renderizarTarjetasSeccion5(data.registros, cont);

    } catch (err) {
      console.error("❌ Error generando propuestas:", err);
      cont.innerHTML = `<p style="color:red;">❌ Error cargando datos.</p>`;
    }

    btnGenerar.disabled = false;
    btnGenerar.textContent = "⚙️ Mostrar Propuestas";
  });
};

// ---------- Helpers visuales para Sección 5 ----------
function urlFotoDeId(id) {
  return id ? `https://lh3.googleusercontent.com/d/${id}=s800` : "https://i.imgur.com/NKpCw5G.png";
}

function urlDescargaDeId(id) {
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : "";
}

function urlStaticMap(coord, apiKey) {
  if (!coord) return "assets/map_placeholder.png";
  return `https://maps.googleapis.com/maps/api/staticmap?center=${coord}&zoom=18&size=360x300&scale=2&maptype=satellite&markers=anchor:center|icon:https://wayfarer.nianticlabs.com/imgpub/marker-green-64.png|${coord}&key=${apiKey}`;
}

function buildTagsDescarga(p) {
  const hasP = !!p.FotoPrincipalID;
  const hasA = !!p.FotoAccesoID;

  // Se ven como tags usando .prop-tag que ya existe en tu CSS
  return `
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;position:absolute;bottom:10px;left:50%;transform:translateX(-50%);z-index:10;">
      ${hasP ? `<a class="prop-tag tag-nueva" href="${urlDescargaDeId(p.FotoPrincipalID)}" download target="_blank" rel="noopener">Descargar Foto Principal</a>` : ""}
      ${hasA ? `<a class="prop-tag tag-reubicada" href="${urlDescargaDeId(p.FotoAccesoID)}" download target="_blank" rel="noopener">Descargar Foto Acceso</a>` : ""}
    </div>
  `;
}

function renderizarTarjetasSeccion5(lista, cont) {
  cont.innerHTML = ""; // limpia

  lista.forEach((p, i) => {
    // Normaliza campos (por si vienen con mayúsculas/minúsculas distintas)
    const titulo = p.titulo || p.Titulo || "(Sin título)";
    const descripcion = p.descripcion || p.Descripcion || "";
    const wayfarer = p.wayfarer || p.Wayfarer || "";
    const lat = (p.Lat || p.lat || "").toString().trim();
    const lng = (p.Lng || p.lng || "").toString().trim();
    const coord = lat && lng ? `${lat},${lng}` : (p.coordenadas || "");
    const direccion = p.Direccion || p.direccion || "";

    // Imagen principal
    const urlFoto = p.FotoPrincipalID ? urlFotoDeId(p.FotoPrincipalID) : urlFotoDeId(null);

    // Tarjeta (mismo layout de pestaña 2)
    const card = document.createElement("article");
    card.className = "gestion-card";
    card.dataset.propuesta = String(p.NumeroPropuesta || p.numero || i + 1);
    card.dataset.titulo = titulo;
    card.dataset.lat = lat || "";
    card.dataset.lng = lng || "";
    card.dataset.nombreSesion = nombreSesionActual || "";
    card.style.position = "relative";

    card.innerHTML = `
<!-- 🔹 ENCABEZADO SOBRE LA IMAGEN -->
<div class="header-card" style="
    position:absolute;
    top:0;
    left:0;
    width:100%;
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:6px 10px;
    background:transparent; /* ✅ Quitamos la capa oscura */
    z-index:5;
">
  <!-- Botón Editar -->
  <button class="btn-editar-propuesta-left btn-accion">
    <i class="fa fa-edit"></i> Editar
  </button>

  <!-- Título eliminado (solo espacio para centrar botones) -->
  <span class="titulo-card" style="flex:1;"></span>

  <!-- Botón Minimizar -->
  <button class="btn-toggle-card" style="
    background:#fff;
    color:#000;
    border:none;
    border-radius:5px;
    padding:3px 8px;
    cursor:pointer;
    font-weight:bold;
    margin-right:20px;
    position:relative;
    z-index:10;
  ">−</button>
</div>



      <!-- IMAGEN -->
      <div class="imagen-area">
        <img src="${urlFoto}" class="imagen-principal" alt="Foto">
        ${buildTagsDescarga(p)}
      </div>

      <!-- CONTENIDO -->
      <div class="contenido">
    
        <!-- Encabezado grande -->
        <div class="prop-titulo" style="text-transform:uppercase;">${titulo}</div>
        <div style="color:#8ff;font-weight:bold;margin:6px 0 10px;">🖼️ Propuesta ${p.NumeroPropuesta || p.numero || (i + 1)}</div>

        <!-- Textos -->
        <div class="texto-propuesta">
          <p><b>Descripción:</b> <span class="txt-descripcion">${descripcion || "(Sin descripción)"}</span></p>
          <p><b>Wayfarer:</b> <span class="txt-wayfarer">${wayfarer || "(Sin texto)"}</span></p>
          <p><b>Coordenada:</b> <span class="txt-coord">${coord || "(Sin coordenadas)"}</span></p>
          <p><b>Dirección:</b> <span class="txt-direccion">${direccion || "(Sin dirección)"}</span></p>
        </div>

        <!-- Acciones de copiado -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:8px;">
          <button class="btn-copy" data-copy="${titulo}">Copiar Título</button>
          <button class="btn-copy" data-copy="${descripcion || ""}">Copiar Descripción</button>
          <button class="btn-copy" data-copy="${wayfarer || ""}">Copiar Wayfarer</button>
        </div>
      </div>

      <!-- MAPA MINI -->
      <div class="mapa">
        <img 
          class="mapa-miniatura" 
          alt="Mapa mini" 
          src="${urlStaticMap(coord, window.APP_CONFIG?.API_KEY)}"
          data-coord="${coord || ""}"
          style="width:100%;height:100%;object-fit:cover;cursor:pointer;"
        />
      </div>
    `;

    cont.appendChild(card);
  });
}

// ---------- Delegación de eventos para toda la Sección 5 ----------
let delegadosInstaladosSeccion5 = false;

function instalarDelegadosSeccion5() {
  if (delegadosInstaladosSeccion5) return;
  delegadosInstaladosSeccion5 = true;

  const cont = document.getElementById("resultadosContainer");
  if (!cont) return;

  cont.addEventListener("click", async (e) => {
    const btnToggle = e.target.closest(".btn-toggle-card");
    const btnEditar = e.target.closest(".btn-editar-propuesta-left");
    const btnCopy = e.target.closest(".btn-copy");
    const miniMapa = e.target.closest(".mapa-miniatura");

    // ✅ 1. COPIAR
    if (btnCopy) {
      const text = btnCopy.getAttribute("data-copy") || "";
      try {
        await navigator.clipboard.writeText(text);
        const prev = btnCopy.textContent;
        btnCopy.textContent = "✅ Copiado";
        setTimeout(() => (btnCopy.textContent = prev), 800);
      } catch {
        alert("⚠️ No se pudo copiar.");
      }
      return;
    }

    // ✅ 2. COLAPSAR / EXPANDIR TARJETA
    if (btnToggle) {
      const card = btnToggle.closest(".gestion-card");
      const contenido = card.querySelector(".contenido");
      const mapa = card.querySelector(".mapa");
      const imagen = card.querySelector(".imagen-area");

      if (card.dataset.colapsada === "1") {
        // 👉 Expandir
        card.querySelector(".barra-colapsada")?.remove();
        contenido.style.display = "";
        mapa.style.display = "";
        imagen.style.display = "";
        card.style.height = "auto";
        btnToggle.textContent = "−";
        card.dataset.colapsada = "0";
      } else {
        // 👉 Colapsar
        contenido.style.display = "none";
        mapa.style.display = "none";
        imagen.style.display = "none";
        card.style.height = "60px";
        btnToggle.textContent = "+";
        card.dataset.colapsada = "1";

        // Barra única (para evitar título duplicado)
        if (!card.querySelector(".barra-colapsada")) {
          const barra = document.createElement("div");
          barra.className = "barra-colapsada";
          barra.style.cssText = `
            text-align:center;
            font-weight:bold;
            padding:8px;
            background:#0d1b2a;
            color:#fff;
          `;
          barra.textContent = `Propuesta ${card.dataset.propuesta} - ${card.dataset.titulo}`;
          card.appendChild(barra);
        }
      }
      return;
    }

    // ✅ 3. BOTÓN EDITAR (funciona aunque hagas clic en el ícono)
    if (btnEditar) {
      const card = btnEditar.closest(".gestion-card");
      const num = Number(card.dataset.propuesta);
      abrirModalEditarTab1({
        numero: num,
        titulo: card.dataset.titulo || "",
        descripcion: card.querySelector(".txt-descripcion")?.textContent || "",
        wayfarer: card.querySelector(".txt-wayfarer")?.textContent || "",
        coord: card.querySelector(".txt-coord")?.textContent || ""
      }, card);
      return;
    }

    // ✅ 4. MINI MAPA → ABRIR VISOR
    if (miniMapa) {
      const coord = miniMapa.getAttribute("data-coord");
      if (!coord) return;
      document.getElementById("modalMapaSat").style.display = "flex";
      document.getElementById("iframeMapaSat").src =
        `https://www.google.com/maps?q=${coord}&t=k&z=18&output=embed`;
      return;
    }
  });
}


// Cerrar visor satelital (tu HTML ya tiene botón que cierra cambiando display)
// ---------- Modal de Edición (ligero) para Tab 1 ----------

function asegurarModalEditarTab1() {
  if (document.getElementById("modal-editar-tab1")) return;

  const wrap = document.createElement("div");
  wrap.id = "modal-editar-tab1";
  wrap.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.6);display:none;align-items:center;justify-content:center;z-index:9999;
  `;
  wrap.innerHTML = `
    <div style="background:#0f1d2b;color:#fff;border-radius:12px;padding:16px;width:95%;max-width:560px;max-height:85vh;overflow:auto;position:relative;">
      <div style="position:absolute;top:8px;right:10px;cursor:pointer;font-size:20px;" id="cerrar-editar-tab1">✖</div>
      <h3 style="margin:6px 0 12px;">Editar propuesta</h3>

      <div style="display:flex;flex-direction:column;gap:10px;">
        <label>Título
          <input type="text" id="edit-titulo-tab1" style="width:100%;padding:8px;border-radius:8px;border:1px solid #34495e;background:#2c3e50;color:#fff;">
        </label>
        <label>Descripción
          <textarea id="edit-desc-tab1" rows="3" style="width:100%;padding:8px;border-radius:8px;border:1px solid #34495e;background:#2c3e50;color:#fff;"></textarea>
        </label>
        <label>Wayfarer
          <textarea id="edit-way-tab1" rows="3" style="width:100%;padding:8px;border-radius:8px;border:1px solid #34495e;background:#2c3e50;color:#fff;"></textarea>
        </label>
        <label>Coordenadas (lat, lng)
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="text" id="edit-coord-tab1" placeholder="-12.046374, -77.042793" style="flex:1;padding:8px;border-radius:8px;border:1px solid #34495e;background:#2c3e50;color:#fff;">
            <button id="btn-pickmap-tab1" class="secondary">Elegir en mapa</button>
          </div>
        </label>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
          <button id="btn-cancelar-tab1" class="btn-secundario">Cancelar</button>
          <button id="btn-guardar-tab1" class="btn-primario">Guardar cambios</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  // Cierres
  const close = () => (wrap.style.display = "none");
  wrap.querySelector("#cerrar-editar-tab1").onclick = close;
  wrap.querySelector("#btn-cancelar-tab1").onclick = close;

  // Picker de mapa
  wrap.querySelector("#btn-pickmap-tab1").onclick = () => {
    const input = document.getElementById("edit-coord-tab1");
    abrirMapPickerTab1(input.value || "");
  };
}

let contextoEdicionTab1 = { numero: 0, card: null };

function abrirModalEditarTab1(data, cardEl) {
  asegurarModalEditarTab1();
  contextoEdicionTab1.numero = data.numero;
  contextoEdicionTab1.card = cardEl;

  document.getElementById("edit-titulo-tab1").value = data.titulo || "";
  document.getElementById("edit-desc-tab1").value = data.descripcion || "";
  document.getElementById("edit-way-tab1").value = data.wayfarer || "";
  document.getElementById("edit-coord-tab1").value = (data.coord || "").trim();

  const modal = document.getElementById("modal-editar-tab1");
  modal.style.display = "flex";

  // Guardar
  const btnGuardar = modal.querySelector("#btn-guardar-tab1");
  btnGuardar.onclick = async () => {
    const titulo = document.getElementById("edit-titulo-tab1").value.trim();
    const desc = document.getElementById("edit-desc-tab1").value.trim();
    const way = document.getElementById("edit-way-tab1").value.trim();
    const coord = document.getElementById("edit-coord-tab1").value.trim();

    // Front: refresco en la tarjeta
    if (contextoEdicionTab1.card) {
      contextoEdicionTab1.card.dataset.titulo = titulo || "(Sin título)";
      contextoEdicionTab1.card.querySelector(".prop-titulo").textContent = titulo || "(Sin título)";
      contextoEdicionTab1.card.querySelector(".txt-descripcion").textContent = desc || "(Sin descripción)";
      contextoEdicionTab1.card.querySelector(".txt-wayfarer").textContent = way || "(Sin texto)";
      contextoEdicionTab1.card.querySelector(".txt-coord").textContent = coord || "(Sin coordenadas)";

      // Actualiza mini-mapa
      const mini = contextoEdicionTab1.card.querySelector(".mapa-miniatura");
      if (mini) {
        mini.setAttribute("data-coord", coord);
        mini.src = urlStaticMap(coord, window.APP_CONFIG?.API_KEY);
      }
    }

    // Back: enviar cambios al GAS (endpoint de edición)
    try {
      const fd = new FormData();
      fd.append("data", JSON.stringify({
        action: "editarPropuestaSesion",  // 👈 Endpoint para tu Apps Script (lo añadimos en Paso 5)
        NombreSesion: nombreSesionActual,
        NumeroPropuesta: contextoEdicionTab1.numero,
        Titulo: titulo,
        Descripcion: desc,
        Wayfarer: way,
        Coordenadas: coord
      }));
      const res = await fetch(DEPLOY_URL, { method: "POST", body: fd });
      const outText = await res.text();
      let out;
      try { out = JSON.parse(outText); } catch { out = { ok: false, mensaje: outText || "Respuesta no válida" }; }

      if (!out.ok) {
        alert("⚠️ Cambios visibles aplicados, pero el backend no confirmó el guardado.\n" + (out.mensaje || ""));
      } else {
        alert("✅ Cambios guardados.");
      }
    } catch (e) {
      console.error(e);
      alert("⚠️ Cambios visibles aplicados, pero hubo un error guardando en servidor.");
    }

    document.getElementById("modal-editar-tab1").style.display = "none";
  };
}

// ---------- Map Picker pequeño (para coordenadas) ----------
let _pickerMap, _pickerMarker;

function asegurarPickerTab1() {
  if (document.getElementById("map-picker-tab1")) return;

  const shell = document.createElement("div");
  shell.id = "map-picker-tab1";
  shell.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);display:none;align-items:center;justify-content:center;z-index:10000;";
  shell.innerHTML = `
    <div style="background:#0a1a2f;padding:10px;border-radius:12px;width:95%;max-width:720px;">
      <div id="map-canvas-tab1" style="width:100%;height:60vh;border-radius:8px;"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
        <button id="btn-cancel-picker-tab1" class="btn-secundario">Cancelar</button>
        <button id="btn-ok-picker-tab1" class="btn-primario">Usar estas coordenadas</button>
      </div>
    </div>
  `;
  document.body.appendChild(shell);

  shell.querySelector("#btn-cancel-picker-tab1").onclick = () => (shell.style.display = "none");
  shell.querySelector("#btn-ok-picker-tab1").onclick = () => {
    if (!_pickerMarker) return;
    const { lat, lng } = _pickerMarker.getPosition().toJSON();
    if (_pickerTargetInput) {
      _pickerTargetInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
    shell.style.display = "none";
  };
}

let _pickerTargetInput = null;

function abrirMapPickerTab1(coordStr) {
  asegurarPickerTab1();

  const shell = document.getElementById("map-picker-tab1");
  shell.style.display = "flex";

  // Carga Maps si hace falta (usa tu main.js)
  if (!window.google || !window.google.maps) {
    loadGoogleMapsApi().then(() => initPickerMap(coordStr));
  } else {
    initPickerMap(coordStr);
  }
}

function initPickerMap(coordStr) {
  const center = parseCoordStr(coordStr) || { lat: -12.046374, lng: -77.042793 };
  const el = document.getElementById("map-canvas-tab1");
  if (!el) return;

  if (_pickerMap) _pickerMap = null;
  _pickerMap = new google.maps.Map(el, {
    center,
    zoom: 18,
    mapTypeId: "hybrid",
    disableDefaultUI: true,
    gestureHandling: "greedy",
  });

  _pickerMarker = new google.maps.Marker({
    position: center,
    map: _pickerMap,
    icon: "https://wayfarer.nianticlabs.com/imgpub/marker-green-64.png",
    draggable: true
  });

  _pickerMap.addListener("click", (e) => {
    if (_pickerMarker) _pickerMarker.setPosition(e.latLng);
  });

  // Guarda el input destino (coordenadas del modal)
  _pickerTargetInput = document.getElementById("edit-coord-tab1");
}

function parseCoordStr(str) {
  if (!str) return null;
  const parts = str.split(",");
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0].trim());
  const lng = parseFloat(parts[1].trim());
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

(function wireModalMapaSat() {
  const modal   = document.getElementById('modalMapaSat');
  const inner   = document.getElementById('modalMapaSatInner');
  const btnX    = document.getElementById('cerrarMapaSat');

  if (!modal || !inner || !btnX) return;

  const cerrar = () => { modal.style.display = 'none'; };

  // Cerrar con la X
  btnX.addEventListener('click', cerrar);

  // Cerrar clickeando el fondo
  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrar();
  });

  // Cerrar con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') cerrar();
  });
})();



// ✅ Abrir modal de mini-mapa SOLO si estamos en TAB1
document.getElementById("tab-content")?.addEventListener("click", function (e) {
  const estaEnTab1 = document.querySelector('#seccion5'); // existe solo en tab1

  if (!estaEnTab1) return; // ⛔ Estamos en Tab2 o Tab3 → NO HACER NADA

  // 📌 Abrir mapa de tarjetas (solo Tab1)
  if (e.target.classList.contains("mapa-miniatura")) {
    const coord = e.target.getAttribute("data-coord");
    if (!coord) return;

    const modal = document.getElementById("mapModalMiniatura");
    if (!modal) return; // si no existe el modal, no hacer nada

    modal.style.display = "flex";
  

    if (!window.google || !window.google.maps) {
      loadGoogleMapsApi().then(() => initMapMiniTab1(coord));
    } else {
      initMapMiniTab1(coord);
    }
  }

  // ❌ Botón de cerrar (solo Tab1)
  if (e.target.id === "mapMiniatura-btn-cerrar") {
    const modal = document.getElementById("mapModalMiniatura");
    if (modal) modal.style.display = "none";
  }
});




// 🔹 Inicializar mapa miniatura (Tab1)
function initMapMiniTab1(coord) {
  const el = document.getElementById("map-canvas-miniatura");
  if (!el) return;

  if (!coord || !coord.includes(',')) return;

  const [lat, lng] = coord.split(",").map(c => parseFloat(c.trim()));

  // 🧹 Limpia todo rastro previo
  el.innerHTML = "";
  el.removeAttribute("data-gm-style"); // ⚡ Evita heredar estilos de Tab2
  el.style.position = "relative";

  // 🔒 Crea un ID único para esta instancia
  const uniqueId = "gmaps_" + Date.now();
  el.id = uniqueId;

  // ⚙️ Re-crear elemento limpio
  const wrapper = document.createElement("div");
  wrapper.style.width = "100%";
  wrapper.style.height = "100%";
  wrapper.style.borderRadius = "8px";
  el.appendChild(wrapper);

  // ✅ Nueva instancia aislada
  const map = new google.maps.Map(wrapper, {
    center: { lat, lng },
    zoom: 16,
    mapTypeId: "satellite",
    disableDefaultUI: true,
    gestureHandling: "greedy"
  });

  new google.maps.Marker({
    position: { lat, lng },
    map,
    icon: "https://wayfarer.nianticlabs.com/imgpub/marker-green-64.png"
  });

  // 🔁 Forzamos re-render luego de 300ms (algunas APIs necesitan reflow)
  setTimeout(() => {
    google.maps.event.trigger(map, "resize");
    map.setCenter({ lat, lng });
  }, 300);
}







// ✅ Inicializar al cargar la pestaña
window.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("btnGenerarPropuestas")) {
    window.initSeccion5Resultados();
  }
});


