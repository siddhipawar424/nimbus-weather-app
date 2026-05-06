let API_KEY = localStorage.getItem("weather_api_key");

if (!API_KEY) {
  API_KEY = prompt("Enter your OpenWeather API Key:");
  if (API_KEY) {
    localStorage.setItem("weather_api_key", API_KEY);
  }
}
const BASE    = "https://api.openweathermap.org/data/2.5";

// — DOM refs —
const searchInput   = document.getElementById("search-input");
const searchBtn     = document.getElementById("search-btn");
const errorMsg      = document.getElementById("error-msg");
const skeleton      = document.getElementById("skeleton");
const weatherCard   = document.getElementById("weather-card");
const hint          = document.getElementById("hint");
const liveTime      = document.getElementById("live-time");

// — Live clock —
function updateClock() {
  const now  = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  liveTime.textContent = `${date} · ${time}`;
}
updateClock();
setInterval(updateClock, 1000);

// — Icon mapping —
function owmIcon(code) {
  return `https://openweathermap.org/img/wn/${code}@2x.png`;
}

// — Utility: format unix timestamp —
function fmtTime(unix, offset) {
  const d = new Date((unix + offset) * 1000);
  return d.toUTCString().match(/(\d{2}:\d{2})/)[1];
}

// — Utility: day name —
function dayName(unix) {
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return days[new Date(unix * 1000).getDay()];
}

// — Show error —
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = "block";
  setTimeout(() => errorMsg.style.display = "none", 3500);
}

// — Loading state —
function setLoading(on) {
  skeleton.classList.toggle("visible", on);
  if (on) {
    weatherCard.classList.remove("visible");
    hint.style.display = "none";
  }
}

// — Glow color —
function glowColor(main) {
  const map = {
    Clear: "rgba(255,210,80,0.35)",
    Clouds: "rgba(140,170,220,0.3)",
    Rain: "rgba(80,140,255,0.35)",
    Drizzle: "rgba(100,180,255,0.3)",
    Thunderstorm: "rgba(160,80,255,0.35)",
    Snow: "rgba(200,230,255,0.4)",
    Mist: "rgba(180,200,220,0.25)",
    Haze: "rgba(200,190,160,0.25)",
    Fog: "rgba(180,200,220,0.25)",
  };
  return map[main] || "rgba(88,195,247,0.25)";
}

// — Render current —
function renderCurrent(data) {
  const tz = data.timezone;

  document.getElementById("city-name").textContent    = data.name;
  document.getElementById("city-country").textContent = `${data.sys.country} · ${data.coord.lat.toFixed(2)}°N, ${Math.abs(data.coord.lon).toFixed(2)}°${data.coord.lon >= 0 ? 'E' : 'W'}`;
  document.getElementById("weather-desc").textContent = data.weather[0].description;
  document.getElementById("temp-main").textContent    = `${Math.round(data.main.temp)}°`;
  document.getElementById("feels-like").textContent   = `${Math.round(data.main.feels_like)}°C`;
  document.getElementById("temp-hi").textContent      = `↑ ${Math.round(data.main.temp_max)}°`;
  document.getElementById("temp-lo").textContent      = `↓ ${Math.round(data.main.temp_min)}°`;
  document.getElementById("humidity").textContent     = `${data.main.humidity}%`;
  document.getElementById("wind").textContent         = `${Math.round(data.wind.speed * 3.6)} km/h`;
  document.getElementById("visibility").textContent   = `${(data.visibility / 1000).toFixed(1)} km`;
  document.getElementById("pressure").textContent     = `${data.main.pressure} hPa`;
  document.getElementById("sunrise").textContent      = fmtTime(data.sys.sunrise, tz);
  document.getElementById("sunset").textContent       = fmtTime(data.sys.sunset, tz);

  document.getElementById("weather-icon").src = owmIcon(data.weather[0].icon);
  document.getElementById("icon-glow").style.background = glowColor(data.weather[0].main);
}

// — Render hourly —
function renderHourly(list, tz) {
  const container = document.getElementById("forecast-scroll");
  container.innerHTML = "";

  list.slice(0, 8).forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "forecast-card" + (i === 0 ? " active" : "");

    const time  = fmtTime(item.dt, tz);
    const temp  = Math.round(item.main.temp);
    const rain  = item.pop ? Math.round(item.pop * 100) : 0;

    card.innerHTML = `
      <span class="forecast-card__time">${i === 0 ? "Now" : time}</span>
      <img class="forecast-card__icon" src="${owmIcon(item.weather[0].icon)}" alt="${item.weather[0].description}">
      <span class="forecast-card__temp">${temp}°</span>
      ${rain > 10 ? `<span class="forecast-card__rain">💧${rain}%</span>` : ''}
    `;
    container.appendChild(card);
  });
}

// — Render daily —
function renderDaily(list) {
  const container = document.getElementById("daily-list");
  container.innerHTML = "";

  const days = {};
  list.forEach(item => {
    const d = new Date(item.dt * 1000);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!days[key]) days[key] = [];
    days[key].push(item);
  });

  Object.keys(days).slice(1, 6).forEach(key => {
    const items = days[key];
    const temps = items.map(i => i.main.temp);
    const hi = Math.round(Math.max(...temps));
    const lo = Math.round(Math.min(...temps));
    const mid = items[Math.floor(items.length / 2)];

    const row = document.createElement("div");
    row.className = "daily-row";
    row.innerHTML = `
      <span class="daily-row__day">${dayName(mid.dt)}</span>
      <img class="daily-row__icon" src="${owmIcon(mid.weather[0].icon)}" alt="${mid.weather[0].description}">
      <span class="daily-row__desc">${mid.weather[0].description}</span>
      <div class="daily-row__temps">
        <span class="daily-row__hi">${hi}°</span>
        <span class="daily-row__lo">${lo}°</span>
      </div>
    `;
    container.appendChild(row);
  });
}

// — Fetch weather —
async function fetchWeather(city) {
  setLoading(true);
  errorMsg.style.display = "none";

  try {
    const currentRes = await fetch(`${BASE}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`);

    if (currentRes.status === 404) {
      setLoading(false);
      hint.style.display = "block";
      showError("⚠ City not found.");
      return;
    }

    if (!currentRes.ok) throw new Error();

    const currentData = await currentRes.json();
    const forecastRes = await fetch(`${BASE}/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`);
    const forecastData = await forecastRes.json();

    renderCurrent(currentData);
    renderHourly(forecastData.list, currentData.timezone);
    renderDaily(forecastData.list);

    setLoading(false);
    weatherCard.classList.add("visible");

  } catch (err) {
    console.error(err); 
    setLoading(false);
    hint.style.display = "block";
    showError("Something went wrong.");
  }
}

// — Events —
searchBtn.addEventListener("click", () => {
  const val = searchInput.value.trim();
  if (val) fetchWeather(val);
});

searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const val = searchInput.value.trim();
    if (val) fetchWeather(val);
  }
});

// — Geolocation —
if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      try {
        const res = await fetch(`${BASE}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
        const data = await res.json();
        searchInput.value = data.name;
        fetchWeather(data.name);
      } catch (err) {
        console.error("Geolocation fetch failed:", err); 
      }
    },
    () => {
      console.warn("Geolocation permission denied"); 
    }
  );
}