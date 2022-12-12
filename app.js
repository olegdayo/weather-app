async function getIP() {
  const resp = await fetch("https://www.cloudflare.com/cdn-cgi/trace");
  let data = await resp.text();

  data = data
    .trim()
    .split("\n")
    .reduce(
      function (obj, pair) {
        pair = pair.split("=");
        return (obj[pair[0]] = pair[1]), obj;
      },
      {},
    );

  return data.ip;
}

function getApiUrl(lat, lon) {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=apparent_temperature,precipitation,rain,snowfall`;
}

async function locationInfo(ip) {
  const resp = await fetch(`https://ipinfo.io/${ip}?token=d018a77044b1c5`);
  const res = await resp.json();

  let region = "Unknown";
  if (res.region) {
    region = res.region;
  }

  return {
    region: region,
    coords: res.loc.split(","),
  };
}

async function getWeatherState(lat, lon) {
  const resp = await fetch(getApiUrl(lat, lon));
  let res = await resp.json();

  res.hourly.temperature = res.hourly.apparent_temperature;
  res.hourly_units.temperature = res.hourly_units.apparent_temperature;

  delete res.hourly.apparent_temperature;
  delete res.hourly_units.apparent_temperature;

  return res;
}

function drawCharts(weather, len) {
  const timeline = weather.hourly.time.map((x) =>
    new Date(x).toLocaleString(
      "ru-RU",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      },
    ),
  );

  let chartOpts = [
    {
      name: "temperature",
      color: [255, 0, 0],
    },
    {
      name: "rain",
      color: [0, 255, 0],
    },
    {
      name: "snowfall",
      color: [0, 255, 0],
    },
    {
      name: "precipitation",
      color: [0, 0, 0],
    },
  ];

  chartOpts.map(
    opt => drawChart(
      `${opt.name}-chart`,
      weather.hourly[opt.name],
      opt.name,
      timeline,
      opt.color,
      len,
    ),
  );
}

function drawChart(elem, data, title, labels, colors, len) {
  new Chart(
    document.getElementById(elem),
    {
      type: "line",
      data: {
        labels: labels.slice(0, len),
        datasets: [
          {
            label: title,
            data: data.slice(0, len),
            fill: false,
            borderColor: `rgb(${colors[0]}, ${colors[1]}, ${colors[2]})`,
            tension: 0.1,
          },
        ],
      },
    },
  );
}

function getDateIndex(weather) {
  const hour = new Date().getHours();

  for (let i = 0; i < weather.hourly.time.length; i++) {
    const weatherHour = Number(
      weather
        .hourly
        .time[i]
        .split("T")[1]
        .split(":")[0],
    );

    if (hour === weatherHour) {
      return i;
    }
  }

  return 0;
}

function concat(chr, ...strs) {
  return strs.join(chr);
}

function addCurrentWeatherInfo(location, weather, index) {
  let loc = document.getElementById("location");
  let temp = document.getElementById("temperature-now");
  let rainy = document.getElementById("is-rainy");
  let snowy = document.getElementById("is-snowy");

  loc.innerHTML = concat(
    " ",
    location.region,
    "(" + concat(", ", ...location.coords) + ")",
  );
  temp.innerHTML = concat(
    " ",
    weather.hourly.temperature[index],
    weather.hourly_units.temperature,
  );
  rainy.innerHTML = weather.hourly.rain[index] > 0 ? "Rainy" : "Dry";
  snowy.innerHTML = weather.hourly.snowfall[index] > 0 ? "Snowy" : "Snowless";
}

async function shareListener() {
  try {
    const text = concat(
      ", ",
      concat(
        " ",
        "The weather in",
        concat(
          " ",
          location.region,
          "(" + concat(", ", ...location.coords) + ")",
        ),
        "is",
        weather.hourly.temperature[index],
        weather.hourly_units.temperature,
      ),
      weather.hourly.rain[index] > 0 ? "rainy" : "dry",
      weather.hourly.snowfall[index] > 0 ? "snowy" : "snowless",
    );

    navigator.clipboard.writeText(text);

    await navigator.share(
      {
        title: text,
        text: text,
      }
    );
  } catch {
    alert("Failed to share");
  }
}

function addSharing(location, weather, index) {
  const shareBtn = document.getElementById("share");

  if (
    !(navigator.clipboard && navigator.clipboard.writeText) &&
    !navigator.share
  ) {
    shareBtn.style.display = "none";
    return;
  }

  const text = concat(
    ", ",
    concat(
      " ",
      "The weather in",
      concat(
        " ",
        location.region,
        "(" + concat(", ", ...location.coords) + ")",
      ),
      "is",
      weather.hourly.temperature[index],
      weather.hourly_units.temperature,
    ),
    weather.hourly.rain[index] > 0 ? "rainy" : "dry",
    weather.hourly.snowfall[index] > 0 ? "snowy" : "snowless",
  );

  shareBtn.addEventListener(
    "click",
    async () => {
      try {
        await navigator.clipboard.writeText(text);

        await navigator.share(
          {
            title: text,
            text: text,
          }
        );
      } catch { }
    }
  );
}

async function main() {
  const location = await locationInfo(await getIP());
  console.log(location);

  const weather = await getWeatherState(...location.coords);
  console.log(weather);

  const index = getDateIndex(weather);
  addCurrentWeatherInfo(location, weather, index);
  addSharing(location, weather, index);

  const len = 40;
  drawCharts(weather, len);
}

main();
