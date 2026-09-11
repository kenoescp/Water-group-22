const $ = (s) => document.querySelector(s);
const cities = { Madrid:{country:'Spain',latitude:40.4168,longitude:-3.7038}, Paris:{country:'France',latitude:48.8566,longitude:2.3522}, London:{country:'United Kingdom',latitude:51.5072,longitude:-.1276}, Berlin:{country:'Germany',latitude:52.52,longitude:13.405}, Turin:{country:'Italy',latitude:45.0703,longitude:7.6869} };
let place = { name: 'Madrid', ...cities.Madrid };
const prototypeInputs = { reservoirBelowAverage: true, copernicusDrought: true, officialStatus: 'pre-alert' };
const sources = [
  ['14-day rainfall', 'Open-Meteo forecast', 'LIVE', 'https://open-meteo.com/'],
  ['Temperature & forecast', 'Open-Meteo forecast', 'LIVE', 'https://open-meteo.com/'],
  ['Reservoir storage', 'Canal de Isabel II', 'OFFICIAL STATIC / MANUAL', 'https://www.canaldeisabelsegunda.es/es/captacion'],
  ['Groundwater levels', 'European Environment Agency', 'PROTOTYPE', 'https://www.eea.europa.eu/en/analysis/maps-and-charts/annual-water-stress-for-present'],
  ['Population water consumption', 'Eurostat water statistics', 'PROTOTYPE', 'https://ec.europa.eu/eurostat/web/environment/water'],
  ['Official drought status', 'MITECO drought reports', 'OFFICIAL STATIC / MANUAL', 'https://www.miteco.gob.es/es/agua/temas/observatorio-nacional-de-la-sequia/informes-mapas-seguimiento.html'],
  ['Copernicus drought indicator', 'Copernicus EDO', 'PROTOTYPE', 'https://www.copernicus.eu/en/european-drought-observatory']
];
function level(score) { return score<=1?'Normal':score===2?'Watch':score<=4?'Alert':'Emergency'; }
async function load() {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=precipitation_sum,temperature_2m_mean&past_days=14&forecast_days=1&timezone=auto`);
    if (!r.ok) throw Error();
    const d = await r.json(), rainValues = d.daily.precipitation_sum.slice(0,14), rainfall = rainValues.reduce((a,b)=>a+(b||0),0), temps = d.daily.temperature_2m_mean.slice(0,14), avgTemp = temps.reduce((a,b)=>a+(b||0),0)/temps.length;
    const rainBad = rainfall < 15, flags = [rainBad, avgTemp > 25, prototypeInputs.reservoirBelowAverage, true, true, ['pre-alert','alert','emergency'].includes(prototypeInputs.officialStatus), prototypeInputs.copernicusDrought];
    const values = [`${rainfall.toFixed(1)} mm`, `${avgTemp.toFixed(1)} °C average`, 'Below average (prototype assumption)', 'Elevated (prototype input)', 'Elevated (prototype input)', `${prototypeInputs.officialStatus} (manual)`, 'Drought signal (prototype input)'];
    const score = flags.filter(Boolean).length, status = level(score);
    $('#risk-score').textContent = `${score}/7`; $('#risk-level').textContent = status; $('#risk-meter').style.width = `${score/7*100}%`;
    $('#rainfall').textContent = rainfall.toFixed(1); $('#rain-note').textContent = rainBad ? 'Below provisional prototype threshold' : 'Near provisional prototype threshold';
    $('#stress').textContent = '0.68'; $('#temperature').textContent = avgTemp.toFixed(1); $('#temp-note').textContent = 'live 14-day average';
    const maxRain=Math.max(...rainValues,1), points=rainValues.map((v,i)=>`${(i*100/13).toFixed(1)},${(100-(v||0)/maxRain*90).toFixed(1)}`).join(' ');
    $('#chart').innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="14-day rainfall and risk trend"><polyline points="${points}" fill="none" stroke="#ed8b49" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>` + rainValues.map(v=>`<div style="height:${Math.max(4,Math.min(100,(v||0)/maxRain*100))}%" title="${(v||0).toFixed(1)} mm"></div>`).join('');
    $('#updated').textContent = `Updated ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · refreshes every 10 minutes · city view only`;
    const drivers = flags.map((flag, i) => flag ? sources[i][0].toLowerCase() : null).filter(Boolean);
    $('#decision-explanation').textContent = `${status}: ${score} of 7 indicators currently signal pressure. The strongest drivers are ${drivers.slice(0, 3).join(', ') || 'no current pressure indicators'}. Prototype inputs are assumptions, not confirmed live facts.`;
    const actions={Normal:['Keep monitoring','No new municipal action is recommended this week.',['No immediate change to public services.'],['Continue routine monitoring and protect readiness.']],Watch:['Prepare, do not activate yet','Verify the trend and prepare public communications.',['Higher risk of restrictions if dry conditions continue.'],['Prepare communications and coordinate with Canal de Isabel II.']],Alert:['Activate targeted water-saving measures','Launch a campaign and reduce non-essential potable-water use.',['Greater pressure on parks, street cleaning, and non-essential uses.'],['Reduce avoidable demand and increase reclaimed-water use where possible.']],Emergency:['Recommend emergency conservation measures','Escalate to regional authorities and activate the emergency plan.',['Possible stronger restrictions and pressure on essential supply.'],['Protect drinking water and coordinate an emergency conservation response.']]};
    $('#recommended-action').textContent=actions[status][0]; $('#decision-outcome').textContent=actions[status][1];
    $('#no-action-list').innerHTML=actions[status][2].map(x=>`<li>${x}</li>`).join(''); $('#action-list').innerHTML=actions[status][3].map(x=>`<li>${x}</li>`).join('');
    $('#source-list').innerHTML = sources.map((s,i)=>`<article class="source-item"><span class="source-dot ${flags[i]?'is-bad':''}"></span><div><strong>${s[0]}</strong><p>${values[i]} · ${flags[i]?'Contributes 1 pressure point':'Contributes 0 pressure points'}</p><small class="data-status">${s[2]}</small><a href="${s[3]}" target="_blank" rel="noreferrer">${s[1]} ↗</a></div></article>`).join('');
  } catch { $('#error').hidden=false; $('#error').textContent='Live rainfall data could not be loaded; showing the last available values.'; }
}
load(); setInterval(load, 600000);
document.querySelectorAll('[data-city]').forEach(button=>button.addEventListener('click',()=>{ if(cities[button.dataset.city]){ place={name:button.dataset.city,...cities[button.dataset.city]}; load(); } }));
