// ===============================
// js/gps_generator.js
// ===============================

(function(){
  function byId(id){ return document.getElementById(id); }
  function qs(s,p=document){ return p.querySelector(s); }
  function qsa(s,p=document){ return [...p.querySelectorAll(s)]; }

  function parseLatLng(raw){
    const t = String(raw||"").trim();
    const m = t.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/);
    if(!m) return null;
    return { lat: parseFloat(m[1]), lng: parseFloat(m[3]) };
  }

  function formatPeruDateTime(){
    const now = new Date();
    const pe = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit', month:'2-digit', year:'numeric',
      hour:'2-digit', minute:'2-digit', hour12:true
    }).formatToParts(now).reduce((acc,p)=>{acc[p.type]=p.value; return acc;}, {});
    const dd = pe.day, mm = pe.month, yyyy = pe.year;
    const hh = pe.hour, min = pe.minute, ap = pe.dayPeriod;
    const gmt = "GMT -05:00";
    return `${dd}/${mm}/${yyyy} ${hh}:${min} ${ap} ${gmt}`;
  }

  function roundRect(ctx,x,y,w,h,r){
    const rr = Math.min(r, w/2, h/2);
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }

  function drawCameraIcon(ctx, x, y, w, h){
    const r = Math.min(w,h);
    const bw = r * 0.8, bh = r * 0.55;
    const cx = x + w - bw, cy = y + (h - bh)/2;
    ctx.save();
    ctx.fillStyle = "#141414";
    ctx.strokeStyle = "#eaeaea";
    ctx.lineWidth = Math.max(2, r*0.05);
    ctx.beginPath();
    const cr = Math.max(4, bw*0.12);
    roundRect(ctx, cx, cy, bw, bh, cr);
    ctx.fill(); ctx.stroke();
    const lx = cx + bw*0.55, ly = cy + bh*0.52, lr = Math.min(bw,bh)*0.22;
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI*2);
    ctx.fillStyle = "#0f0f0f"; ctx.fill();
    ctx.strokeStyle = "#dcdcdc"; ctx.stroke();
    const fx = cx + bw*0.18, fy = cy + bh*0.22, fw = bw*0.18, fh = bh*0.18;
    ctx.beginPath();
    roundRect(ctx, fx, fy, fw, fh, cr*0.6);
    ctx.fillStyle = "#1e1e1e"; ctx.fill();
    ctx.strokeStyle = "#dcdcdc"; ctx.stroke();
    ctx.fillStyle = "#f2f2f2";
    ctx.font = `${Math.max(10, Math.round(r*0.18))}px "Open Sans", Arial, sans-serif`;
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    ctx.fillText("GPS Map Camera", cx + bw - 8, cy + bh + Math.max(10, r*0.12));
    ctx.restore();
  }

  function drawOverlayOnImage(img, options){
    const { cityLine, addressLine, coordsText, dateTimeText, mapThumb, watermark } = options;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(img, 0, 0, w, h);

    const margin = Math.round(w * 0.02);
    const bandH = Math.max(120, Math.round(h * 0.18));
    const y0 = h - bandH;

    ctx.fillStyle = "rgba(0,0,0,0.86)";
    ctx.fillRect(0, y0, w, bandH);

    const leftPad = margin + 8;
    const rightPad = margin + 8;
    const textMaxW = w - leftPad - rightPad;

    const base = Math.max(18, Math.round(w * 0.018));
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    let xText = leftPad;
    let yText = y0 + Math.round(bandH*0.18);

    let mapSize = 0;
    if(mapThumb){
      mapSize = Math.min(Math.round(bandH*0.9), Math.round(w*0.18));
      const mapX = leftPad;
      const mapY = y0 + (bandH - mapSize)/2;
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, mapX-2, mapY-2, mapSize+4, mapSize+4, 10);
      ctx.fillStyle = "#0f0f0f"; ctx.fill();
      ctx.clip();
      ctx.drawImage(mapThumb, mapX, mapY, mapSize, mapSize);
      ctx.restore();
      xText = leftPad + mapSize + Math.round(w*0.015);
    }

    const lines = [
      { text: cityLine, weight: 700 },
      { text: addressLine, weight: 600 },
      { text: coordsText, weight: 600 },
      { text: dateTimeText, weight: 600 }
    ];
    const lh = Math.round(base*1.35);
    lines.forEach((ln,i)=>{
      if(!ln.text) return;
      ctx.font = `${ln.weight} ${Math.round(base*(i===0?1.0:0.95))}px "Open Sans", Arial, sans-serif`;
      ctx.fillStyle = i===0 ? "#ffffff" : "#e6eef8";
      ctx.fillText(ln.text, xText, yText, textMaxW - (mapSize?mapSize:0));
      yText += lh;
    });

    if(watermark){
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${Math.round(base*2)}px "Open Sans", Arial, sans-serif`;
      ctx.textAlign = "right"; ctx.textBaseline = "bottom";
      ctx.fillText(watermark, w - margin, h - Math.round(bandH*0.1));
      ctx.restore();
    }

    const iconAreaW = Math.min(Math.round(w*0.28), 360);
    drawCameraIcon(ctx, w - iconAreaW - rightPad, y0, iconAreaW, bandH-8);

    return canvas;
  }

  async function fileToImage(file){
    return new Promise((resolve,reject)=>{
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = ()=>{ URL.revokeObjectURL(url); resolve(img); };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function optionalMapToImage(file){
    if(!file) return null;
    try { return await fileToImage(file); } catch(e){ return null; }
  }

  async function generate(){
    const files = byId('gpsmc-images').files;
    const coordsRaw = byId('gpsmc-coords').value;
    const city = byId('gpsmc-city').value.trim();
    const addr = byId('gpsmc-address').value.trim();
    const watermark = byId('gpsmc-watermark').value.trim();
    const mapFile = byId('gpsmc-mapfile').files[0] || null;

    if(!files || !files.length) return alert("⚠️ Sube al menos una imagen.");

    const parsed = parseLatLng(coordsRaw);
    const dateTimeText = formatPeruDateTime();

    const coordsText = parsed
      ? `Lat: ${parsed.lat}°  Long: ${parsed.lng}°`
      : `Lat: —  Long: —`;

    const mapImg = await optionalMapToImage(mapFile);
    const results = byId('gpsmc-results');
    results.innerHTML = '';

    for (const f of files){
      const img = await fileToImage(f);
      const canvas = drawOverlayOnImage(img, {
        cityLine: city,
        addressLine: addr,
        coordsText,
        dateTimeText,
        mapThumb: mapImg,
        watermark
      });

      const card = document.createElement('div');
      card.className = 'gpsmc-card';
      const wrap = document.createElement('div');
      wrap.className = 'gpsmc-canvas-wrap';
      wrap.appendChild(canvas);

      const meta = document.createElement('div');
      meta.className = 'gpsmc-meta';
      const name = document.createElement('div');
      name.className = 'gpsmc-name';
      name.textContent = f.name;

      const actions = document.createElement('div');
      actions.className = 'gpsmc-actions';

      const btnDl = document.createElement('button');
      btnDl.className = 'gpsmc-action';
      btnDl.textContent = 'Descargar';
      btnDl.addEventListener('click', ()=>{
        const a = document.createElement('a');
        a.download = f.name.replace(/\.(png|jpg|jpeg|webp|gif)$/i,'') + '_gpsmap.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
      });

      const btnCopy = document.createElement('button');
      btnCopy.className = 'gpsmc-action';
      btnCopy.textContent = 'Copiar PNG';
      btnCopy.addEventListener('click', async ()=>{
        try{
          canvas.toBlob(async (blob)=>{
            if(!blob) return;
            await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
          }, 'image/png');
        }catch(e){ alert("⚠️ No se pudo copiar."); }
      });

      actions.appendChild(btnDl);
      actions.appendChild(btnCopy);
      meta.appendChild(name);
      meta.appendChild(actions);

      card.appendChild(wrap);
      card.appendChild(meta);
      results.appendChild(card);
    }
  }

  function bindUI(){
    const btn = byId('gpsmc-generate');
    if(btn) btn.addEventListener('click', generate);
  }

  function initGPSImageGenerator(){
    const section = byId('gpsmapcam-section');
    if(section) bindUI();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initGPSImageGenerator);
  } else {
    initGPSImageGenerator();
  }
})();
