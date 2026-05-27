const map = L.map('map').setView([38.00665, -85.26772], 14);

L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 19
  }
).addTo(map);

const catches = [];

function addCatch(lat, lng) {
  const marker = L.marker([lat, lng]).addTo(map);

  const catchData = {
    species: 'Largemouth Bass',
    length: '18.5',
    weight: '3.2',
    lure: 'Rage Craw - Green Pumpkin',
    photo: ''
  };

  catches.push(catchData);

  marker.on('click', () => {
    showCard(catchData);
  });
}

function showCard(c) {
  const card = document.getElementById('detailCard');

  card.innerHTML = `
    <button class="closeBtn" onclick="closeCard()">×</button>
    <h2>${c.species}</h2>

    ${
      c.photo
      ? `<img src="${c.photo}" class="thumb">`
      : ''
    }

    <p><b>Length:</b> ${c.length} in</p>
    <p><b>Weight:</b> ${c.weight} lb</p>
    <p><b>Lure:</b> ${c.lure}</p>

    <input type="file" id="photoInput" accept="image/*">
  `;

  card.classList.remove('hidden');

  const input = document.getElementById('photoInput');

  input.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = evt => {
      c.photo = evt.target.result;
      showCard(c);
    };

    reader.readAsDataURL(file);
  });
}

function closeCard() {
  document.getElementById('detailCard').classList.add('hidden');
}

map.on('click', e => {
  addCatch(e.latlng.lat, e.latlng.lng);
});
