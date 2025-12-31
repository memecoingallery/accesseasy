// search.js — Logik für das regionale Event-Suche-Interface
// Deutsch kommentiert, benutzt Geolocation + Fallback auf Stadt/PLZ
// Einfaches clientseitiges Filtern anhand einer Beispiel-Datenquelle (data/events.json)

const EVENTS_URL = './data/events.json';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const statusEl = $('#status');
const listEl = $('#events-list');
const template = document.getElementById('event-template');
const menuToggle = document.getElementById('menu-toggle');
const menu = document.getElementById('menu');

let events = [];

// --- Hilfsfunktionen ---
function setStatus(msg) {
  statusEl.textContent = msg || '';
}

function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const toRad = (deg) => deg * Math.PI / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Debounce
function debounce(fn, wait=300){
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(()=> fn(...args), wait);
  };
}

// Render helpers
function renderEvents(list) {
  listEl.innerHTML = '';
  if(!list.length){
    listEl.innerHTML = `<li class="event-card"><div class="event-description">Keine Events gefunden.</div></li>`;
    return;
  }
  list.forEach(ev => {
    const clone = template.content.cloneNode(true);
    clone.querySelector('.event-title').textContent = ev.title;
    clone.querySelector('.event-meta').textContent = `${ev.city} • ${ev.date} • ${ev.distance !== undefined ? Math.round(ev.distance) + ' km' : ''}`;
    clone.querySelector('.event-description').textContent = ev.description;
    clone.querySelector('.view-btn').addEventListener('click', ()=> alert(`${ev.title}\n\n${ev.description}`));
    clone.querySelector('.ticket-btn').addEventListener('click', ()=> {
      if(ev.url) window.open(ev.url, '_blank');
      else alert('Keine Ticket-URL vorhanden.');
    });
    listEl.appendChild(clone);
  });
}

// --- Laden der Events ---
async function loadEvents(){
  setStatus('Events werden geladen …');
  try{
    const res = await fetch(EVENTS_URL, {cache: "no-store"});
    if(!res.ok) throw new Error('Fehler beim Laden der Event-Datei');
    events = await res.json();
    setStatus(`Geladen: ${events.length} Events (Beispieldaten).`);
  }catch(err){
    setStatus('Konnte Events nicht laden. ' + err.message);
    console.error(err);
  }
}

// --- Suche / Filter ---
async function searchWithLocation(lat, lon, query='', radiusKm=10){
  setStatus('Suche in der Nähe …');
  const q = (query||'').trim().toLowerCase();
  // berechne Distanz und filtere
  const filtered = events.map(ev => {
    const distance = haversineDistance([lat, lon], [ev.lat, ev.lon]);
    return {...ev, distance};
  }).filter(ev => ev.distance <= radiusKm)
    .filter(ev => {
      if(!q) return true;
      return (ev.title + ' ' + ev.tags + ' ' + ev.description + ' ' + ev.city).toLowerCase().includes(q);
    })
    .sort((a,b) => a.distance - b.distance);
  renderEvents(filtered);
  setStatus(`${filtered.length} Ereignis(se) innerhalb von ${radiusKm} km gefunden.`);
}

// Fallback: einfache "Geocoding"-Nähe über PLZ/Stadt; hier: Use events.json to pick city center
function geocodeCity(cityOrPostal){
  // Einfacher heuristischer Versuch: suche eine Event-Stadt, die den Text enthält.
  const needle = (cityOrPostal||'').trim().toLowerCase();
  if(!needle) return null;
  const found = events.find(ev => ev.city && ev.city.toLowerCase().includes(needle));
  if(found) return {lat: found.lat, lon: found.lon, city: found.city};
  return null;
}

// --- UI Interaktionen ---
document.addEventListener('DOMContentLoaded', async () => {
  await loadEvents();

  // Menü toggeln (einfach)
  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    menu.classList.toggle('hidden');
    menu.setAttribute('aria-hidden', String(expanded));
  });

  // Geolocation-Button
  $('#geo-btn').addEventListener('click', () => {
    if(!navigator.geolocation){
      setStatus('Geolocation wird vom Browser nicht unterstützt.');
      return;
    }
    setStatus('Frage nach deinem Standort …');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude, lon = pos.coords.longitude;
      const query = $('#query').value;
      const radius = Number($('#radius').value);
      await searchWithLocation(lat, lon, query, radius);
    }, (err) => {
      console.warn(err);
      setStatus('Standort konnte nicht ermittelt werden. Du kannst stattdessen eine Stadt/PLZ eingeben.');
      // Fallback UI zeigen
      $('#fallback-location').classList.remove('hidden');
      $('#fallback-location').setAttribute('aria-hidden', 'false');
    }, {timeout: 10000});
  });

  // Fallback: Stadt verwenden
  $('#use-city').addEventListener('click', async () => {
    const city = $('#city').value;
    const loc = geocodeCity(city);
    if(!loc){
      setStatus('Konnte keine Koordinaten für die angegebene Stadt/PLZ finden. Probiere eine andere Eingabe.');
      return;
    }
    setStatus(`Verwende Position von ${loc.city}`);
    const radius = Number($('#radius').value);
    await searchWithLocation(loc.lat, loc.lon, $('#query').value, radius);
  });

  // Formular-Suche
  $('#search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('Suche wird ausgeführt …');
    // Versuche Geolocation zuerst, sonst Fallback nach Stadt falls sichtbar, sonst suche global nach Begriff
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        await searchWithLocation(lat, lon, $('#query').value, Number($('#radius').value));
      }, async () => {
        // Falls Fehler, wenn fallback sichtbar: benutze Stadt, sonst globale Suche
        const fallback = document.getElementById('fallback-location');
        if(!fallback.classList.contains('hidden')){
          const loc = geocodeCity($('#city').value);
          if(loc) await searchWithLocation(loc.lat, loc.lon, $('#query').value, Number($('#radius').value));
          else { // globale text-Suche
            const q = ($('#query').value||'').toLowerCase();
            const filtered = events.filter(ev => (ev.title + ' ' + ev.tags + ' ' + ev.description + ' ' + ev.city).toLowerCase().includes(q));
            renderEvents(filtered);
            setStatus(`${filtered.length} Ergebnisse (globale Suche).`);
          }
        }else{
          const q = ($('#query').value||'').toLowerCase();
          const filtered = events.filter(ev => (ev.title + ' ' + ev.tags + ' ' + ev.description + ' ' + ev.city).toLowerCase().includes(q));
          renderEvents(filtered);
          setStatus(`${filtered.length} Ergebnisse (globale Suche).`);
        }
      }, {timeout:8000});
    } else {
      // Kein Geolocation
      const q = ($('#query').value||'').toLowerCase();
      const filtered = events.filter(ev => (ev.title + ' ' + ev.tags + ' ' + ev.description + ' ' + ev.city).toLowerCase().includes(q));
      renderEvents(filtered);
      setStatus(`${filtered.length} Ergebnisse (lokale Suche).`);
    }
  });

  // Sofort eine initiale Liste anzeigen (z. B. alle kommenden Events)
  renderEvents(events.slice(0, 12));
  setStatus('Zeige Beispiel-Events. Nutze die Suche oder „In meiner Nähe suchen”.');

  // Keyboard accessibility: esc schließt Menü
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){
      menu.classList.add('hidden');
      menuToggle.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
    }
  });

  // Tipp: Suche beim Tippen debounced
  $('#query').addEventListener('input', debounce(() => {
    // Wenn nur Text eingegeben wird, mache eine globale Textsuche
    const q = $('#query').value.trim();
    if(q.length >= 2){
      const filtered = events.filter(ev => (ev.title + ' ' + ev.tags + ' ' + ev.description + ' ' + ev.city).toLowerCase().includes(q.toLowerCase()));
      renderEvents(filtered);
      setStatus(`${filtered.length} Ergebnisse (Live-Filter)`);
    } else if (q.length === 0) {
      renderEvents(events.slice(0,12));
      setStatus('Zeige Beispiel-Events.');
    }
  }, 300));
});
