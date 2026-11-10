const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_API = "https://api.open-meteo.com/v1/forecast";
const searchForm = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const suggestions = document.querySelector("#city-suggestions");
const weatherCard = document.querySelector("#current-weather");
const statusMessage = document.querySelector("#weather-status");
const forecastGrid = document.querySelector("#forecast-grid");
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
let suggestionTimer;
let suggestionController;
let requestController;
let activeSuggestion = -1;
const cityAliases = new Map([
  ["台北", "Taipei"], ["臺北", "Taipei"], ["台北市", "Taipei"], ["臺北市", "Taipei"],
  ["新北", "New Taipei City"], ["新北市", "New Taipei City"],
  ["桃園", "Taoyuan"], ["桃園市", "Taoyuan"], ["桃園區", "Taoyuan"],
  ["台中", "Taichung"], ["臺中", "Taichung"], ["台中市", "Taichung"], ["臺中市", "Taichung"],
  ["台南", "Tainan"], ["臺南", "Tainan"], ["台南市", "Tainan"], ["臺南市", "Tainan"],
  ["高雄", "Kaohsiung"], ["高雄市", "Kaohsiung"],
  ["新竹", "Hsinchu"], ["新竹市", "Hsinchu"], ["基隆", "Keelung"], ["基隆市", "Keelung"],
  ["嘉義", "Chiayi"], ["嘉義市", "Chiayi"],
]);

const weatherDescriptions = new Map([
  [0, ["晴朗", "☀️"]], [1, ["大致晴朗", "🌤️"]], [2, ["局部多雲", "⛅"]], [3, ["陰天", "☁️"]],
  [45, ["有霧", "🌫️"]], [48, ["霧凇", "🌫️"]], [51, ["毛毛雨", "🌦️"]], [53, ["毛毛雨", "🌦️"]],
  [55, ["濃毛毛雨", "🌧️"]], [56, ["凍毛毛雨", "🌧️"]], [57, ["強凍毛毛雨", "🌧️"]],
  [61, ["小雨", "🌧️"]], [63, ["中雨", "🌧️"]], [65, ["大雨", "🌧️"]], [66, ["凍雨", "🌧️"]],
  [67, ["強凍雨", "🌧️"]], [71, ["小雪", "🌨️"]], [73, ["中雪", "🌨️"]], [75, ["大雪", "❄️"]],
  [77, ["雪粒", "🌨️"]], [80, ["局部陣雨", "🌦️"]], [81, ["陣雨", "🌧️"]], [82, ["強陣雨", "⛈️"]],
  [85, ["陣雪", "🌨️"]], [86, ["強陣雪", "❄️"]], [95, ["雷雨", "⛈️"]], [96, ["雷雨伴隨冰雹", "⛈️"]],
  [99, ["強雷雨伴隨冰雹", "⛈️"]],
]);

function getWeather(code) {
  return weatherDescriptions.get(code) ?? ["天氣狀況未知", "🌡️"];
}

function setStatus(message = "", isError = false) {
  statusMessage.textContent = message;
  statusMessage.hidden = !message;
  statusMessage.classList.toggle("error", isError);
}

function getLocationDetails(place) {
  const country = place.country_code === "TW" ? "台灣" : place.country;
  const region = place.country_code === "TW" ? "" : place.admin1;
  return [region, country].filter((part, index, parts) => part && parts.indexOf(part) === index && part !== place.name).join(" · ");
}

function closeSuggestions() {
  suggestions.classList.remove("open");
  cityInput.setAttribute("aria-expanded", "false");
  cityInput.removeAttribute("aria-activedescendant");
  activeSuggestion = -1;
}

async function findCities(name, signal) {
  const searchName = cityAliases.get(name.trim()) ?? name.trim();
  const params = new URLSearchParams({ name: searchName, count: "6", language: "zh-TW", format: "json" });
  const response = await fetch(`${GEOCODING_API}?${params}`, { signal });
  if (!response.ok) throw new Error("無法搜尋城市，請稍後再試。");
  const data = await response.json();
  return data.results ?? [];
}

function renderSuggestions(places) {
  suggestions.replaceChildren();
  places.forEach((place, index) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "suggestion";
    option.id = `city-suggestion-${index}`;
    option.role = "option";
    option.setAttribute("aria-selected", "false");
    option.dataset.index = String(index);
    const name = document.createElement("span");
    name.textContent = place.name;
    const details = document.createElement("small");
    details.textContent = getLocationDetails(place);
    option.append(name, details);
    option.addEventListener("click", () => {
      cityInput.value = place.name;
      closeSuggestions();
      loadWeather(place);
    });
    suggestions.append(option);
  });
  if (places.length) {
    suggestions.dataset.places = JSON.stringify(places);
    suggestions.classList.add("open");
    cityInput.setAttribute("aria-expanded", "true");
  } else {
    delete suggestions.dataset.places;
    closeSuggestions();
  }
}

cityInput.addEventListener("input", () => {
  window.clearTimeout(suggestionTimer);
  suggestionController?.abort();
  const name = cityInput.value.trim();
  if (name.length < 2) {
    closeSuggestions();
    return;
  }
  suggestionTimer = window.setTimeout(async () => {
    suggestionController = new AbortController();
    try {
      const places = await findCities(name, suggestionController.signal);
      if (cityInput.value.trim() === name) renderSuggestions(places);
    } catch (error) {
      if (error.name !== "AbortError") setStatus(error.message, true);
    }
  }, 250);
});

cityInput.addEventListener("keydown", (event) => {
  const options = [...suggestions.querySelectorAll(".suggestion")];
  if (!options.length || !suggestions.classList.contains("open")) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    activeSuggestion = (activeSuggestion + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
    options.forEach((option, index) => {
      option.setAttribute("aria-selected", String(index === activeSuggestion));
      if (index === activeSuggestion) cityInput.setAttribute("aria-activedescendant", option.id);
    });
  } else if (event.key === "Enter" && activeSuggestion >= 0) {
    event.preventDefault();
    options[activeSuggestion].click();
  } else if (event.key === "Escape") {
    closeSuggestions();
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-field")) closeSuggestions();
});

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = cityInput.value.trim();
  if (!name) {
    setStatus("請先輸入城市名稱。", true);
    cityInput.focus();
    return;
  }
  closeSuggestions();
  suggestionController?.abort();
  try {
    const places = await findCities(name);
    if (!places.length) {
      setStatus(`找不到「${name}」，請確認拼寫後再試。`, true);
      return;
    }
    loadWeather(places[0]);
  } catch (error) {
    if (error.name !== "AbortError") setStatus(error.message, true);
  }
});

async function loadWeather(place) {
  requestController?.abort();
  requestController = new AbortController();
  const { signal } = requestController;
  weatherCard.setAttribute("aria-busy", "true");
  setStatus("正在載入天氣資料…");

  try {
    const params = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,uv_index",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      forecast_days: "7",
      timezone: "auto",
      wind_speed_unit: "kmh",
    });
    const response = await fetch(`${FORECAST_API}?${params}`, { signal });
    if (!response.ok) throw new Error("目前無法取得天氣資料，請稍後再試。");
    const data = await response.json();
    if (!data.current || !data.daily) throw new Error("天氣服務回傳的資料格式不正確。");
    renderWeather(place, data);
    setStatus("");
  } catch (error) {
    if (error.name !== "AbortError") setStatus(error.message || "載入天氣時發生錯誤。", true);
  } finally {
    if (!signal.aborted) weatherCard.setAttribute("aria-busy", "false");
  }
}

function renderWeather(place, data) {
  const current = data.current;
  const daily = data.daily;
  const [description, icon] = getWeather(current.weather_code);
  const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
    timeZone: data.timezone,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  document.querySelector("#city-name").textContent = place.name;
  document.querySelector("#city-country").textContent = getLocationDetails(place);
  document.querySelector("#local-time").textContent = dateFormatter.format(new Date());
  document.querySelector("#current-icon").textContent = icon;
  document.querySelector("#current-description").textContent = description;
  document.querySelector("#current-temperature").textContent = Math.round(current.temperature_2m);
  document.querySelector("#feels-like").textContent = Math.round(current.apparent_temperature);
  document.querySelector("#humidity").textContent = current.relative_humidity_2m;
  document.querySelector("#wind-speed").textContent = Math.round(current.wind_speed_10m);
  document.querySelector("#uv-index").textContent = Number(current.uv_index).toFixed(1);
  document.querySelector("#today-high").textContent = Math.round(daily.temperature_2m_max[0]);
  document.querySelector("#today-low").textContent = Math.round(daily.temperature_2m_min[0]);

  const weekDayFormatter = new Intl.DateTimeFormat("zh-TW", { timeZone: "UTC", weekday: "short", month: "numeric", day: "numeric" });
  forecastGrid.replaceChildren();
  daily.time.forEach((date, index) => {
    const [dayDescription, dayIcon] = getWeather(daily.weather_code[index]);
    const card = document.createElement("article");
    card.className = "forecast-day glass-card";
    const heading = document.createElement("h3");
    heading.textContent = index === 0 ? "今天" : weekDayFormatter.format(new Date(`${date}T12:00:00Z`));
    heading.setAttribute("aria-label", `${heading.textContent}，${dayDescription}`);
    const forecastIcon = document.createElement("div");
    forecastIcon.className = "forecast-icon";
    forecastIcon.setAttribute("aria-hidden", "true");
    forecastIcon.textContent = dayIcon;
    const temperatures = document.createElement("div");
    temperatures.className = "forecast-temperatures";
    const high = document.createElement("span");
    high.textContent = `${Math.round(daily.temperature_2m_max[index])}°`;
    const low = document.createElement("span");
    low.textContent = `${Math.round(daily.temperature_2m_min[index])}°`;
    temperatures.append(high, low);
    const rain = document.createElement("div");
    rain.className = "forecast-rain";
    rain.textContent = `☂ ${daily.precipitation_probability_max[index] ?? 0}%`;
    card.append(heading, forecastIcon, temperatures, rain);
    forecastGrid.append(card);
  });
}

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "開啟導覽選單" : "關閉導覽選單");
  navLinks.classList.toggle("open", !isExpanded);
});

navLinks.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "開啟導覽選單");
    navLinks.classList.remove("open");
  }
});

async function loadDefaultWeather() {
  try {
    const places = await findCities("Taoyuan");
    const taoyuan = places.find((place) => place.country_code === "TW")
      ?? places.find((place) => place.name.toLowerCase() === "taoyuan");
    if (!taoyuan) throw new Error("找不到預設城市桃園，請使用搜尋功能選擇城市。");
    loadWeather({ ...taoyuan, name: "桃園" });
  } catch (error) {
    if (error.name !== "AbortError") {
      setStatus(error.message || "無法載入預設城市天氣，請搜尋其他城市。", true);
      weatherCard.setAttribute("aria-busy", "false");
    }
  }
}

loadDefaultWeather();
