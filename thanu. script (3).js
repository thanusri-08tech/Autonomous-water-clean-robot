// ===== AquaBot Simulation =====
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// Loader
const loaderSteps = ["Booting navigation core","Calibrating sensors","Connecting telemetry","Loading AI models","Systems online"];
let lsi = 0;
const loaderTimer = setInterval(() => {
  lsi++;
  if (lsi < loaderSteps.length) $("#loaderStatus").textContent = loaderSteps[lsi];
  else { clearInterval(loaderTimer); $("#loader").classList.add("hide"); }
}, 450);

// Theme
$("#themeToggle").addEventListener("click", () => document.body.classList.toggle("light"));

// Clock
setInterval(() => { $("#clock").textContent = new Date().toLocaleTimeString(); }, 1000);

// State
const state = {
  battery: 78, charging: false, cleaning: 34, area: 1240, areaTotal: 3600,
  speed: 1.4, bottles: 128, bags: 64, floating: 212,
  bottlesPrev: 128, bagsPrev: 64, floatPrev: 212,
  obstDist: 4.2, obstType: "clear",
  grid: Array.from({length:100},()=>"pending"),
};
// seed grid
for (let i=0;i<28;i++) state.grid[Math.floor(Math.random()*100)] = "cleaned";
state.grid[Math.floor(Math.random()*100)] = "active";

// Coverage grid render
const covEl = $("#coverageGrid");
function renderGrid(){
  covEl.innerHTML = state.grid.map(c=>`<div class="${c==='pending'?'':c}"></div>`).join("");
  const cleaned = state.grid.filter(c=>c==="cleaned").length;
  $("#covCount").textContent = cleaned + "%";
}
renderGrid();

// Activity feed
const events = [
  ["waste","Plastic bottle detected at zone B4"],
  ["complete","Collection mechanism engaged"],
  ["obstacle","Floating log avoided successfully"],
  ["route","Navigation route recalculated"],
  ["waste","Plastic bag detected at zone D7"],
  ["complete","Zone C3 cleaning completed"],
  ["complete","Waste deposited to onboard bin"],
  ["obstacle","Boat detected — slowing down"],
  ["route","Heading to next pending zone"],
  ["waste","Floating debris cluster found"],
];
const actEl = $("#activity");
function pushActivity(){
  const [type,text] = events[Math.floor(Math.random()*events.length)];
  const t = new Date().toLocaleTimeString();
  const li = document.createElement("li");
  li.className = type;
  li.innerHTML = `<span>${text}</span><time>${t}</time>`;
  actEl.prepend(li);
  while(actEl.children.length>12) actEl.lastChild.remove();
}
for(let i=0;i<5;i++) pushActivity();

// SVG simulation canvas
const svg = $("#simSvg");
const NS = "http://www.w3.org/2000/svg";
function rect(x,y,w,h,fill,extra={}){const r=document.createElementNS(NS,"rect");r.setAttribute("x",x);r.setAttribute("y",y);r.setAttribute("width",w);r.setAttribute("height",h);r.setAttribute("fill",fill);Object.entries(extra).forEach(([k,v])=>r.setAttribute(k,v));return r;}
function circle(cx,cy,r,fill,extra={}){const c=document.createElementNS(NS,"circle");c.setAttribute("cx",cx);c.setAttribute("cy",cy);c.setAttribute("r",r);c.setAttribute("fill",fill);Object.entries(extra).forEach(([k,v])=>c.setAttribute(k,v));return c;}

let robotPath = [{x:60,y:60}];
let robot = {x:60,y:60,dx:2,dy:1.4};
let wastes = Array.from({length:8},()=>({x:Math.random()*560+20,y:Math.random()*320+20,type:Math.random()>.5?"bottle":"bag"}));
let obstacles = [{x:400,y:200,r:18,type:"log"},{x:200,y:280,r:14,type:"rock"}];

function drawSim(){
  svg.innerHTML = "";
  // water grid
  for(let i=0;i<12;i++) for(let j=0;j<8;j++){
    svg.appendChild(rect(i*50,j*45,50,45,"transparent",{stroke:"rgba(122,216,255,0.05)","stroke-width":1}));
  }
  // path trail
  if(robotPath.length>1){
    const p = document.createElementNS(NS,"polyline");
    p.setAttribute("points", robotPath.map(pt=>`${pt.x},${pt.y}`).join(" "));
    p.setAttribute("fill","none");
    p.setAttribute("stroke","rgba(122,255,198,0.5)");
    p.setAttribute("stroke-width","2");
    p.setAttribute("stroke-dasharray","4 4");
    svg.appendChild(p);
  }
  // obstacles
  obstacles.forEach(o=>{
    svg.appendChild(circle(o.x,o.y,o.r,"rgba(255,122,138,0.25)",{stroke:"#ff7a8a","stroke-width":2}));
    const t = document.createElementNS(NS,"text"); t.setAttribute("x",o.x); t.setAttribute("y",o.y+4); t.setAttribute("text-anchor","middle"); t.setAttribute("font-size","12"); t.textContent="⚠"; svg.appendChild(t);
  });
  // wastes
  wastes.forEach(w=>{
    svg.appendChild(circle(w.x,w.y,8,"rgba(255,210,122,0.3)",{stroke:"#ffd27a","stroke-width":1.5}));
    const t = document.createElementNS(NS,"text"); t.setAttribute("x",w.x); t.setAttribute("y",w.y+5); t.setAttribute("text-anchor","middle"); t.setAttribute("font-size","12"); t.textContent= w.type==="bottle"?"🧴":"🛍️"; svg.appendChild(t);
  });
  // robot
  svg.appendChild(circle(robot.x,robot.y,16,"rgba(122,216,255,0.25)"));
  svg.appendChild(circle(robot.x,robot.y,10,"#7ad8ff",{stroke:"#fff","stroke-width":2}));
  const dirX = robot.x + robot.dx*8, dirY = robot.y + robot.dy*8;
  const ln = document.createElementNS(NS,"line"); ln.setAttribute("x1",robot.x);ln.setAttribute("y1",robot.y);ln.setAttribute("x2",dirX);ln.setAttribute("y2",dirY);ln.setAttribute("stroke","#fff");ln.setAttribute("stroke-width",2);svg.appendChild(ln);
}

function tickSim(){
  robot.x += robot.dx; robot.y += robot.dy;
  if(robot.x<20||robot.x>580) robot.dx*=-1;
  if(robot.y<20||robot.y>340) robot.dy*=-1;
  if(Math.random()<0.05){ robot.dx = (Math.random()*4-2); robot.dy = (Math.random()*3-1.5); }
  robotPath.push({x:robot.x,y:robot.y});
  if(robotPath.length>50) robotPath.shift();
  // collect waste if close
  wastes = wastes.filter(w=>{
    const d = Math.hypot(w.x-robot.x,w.y-robot.y);
    if(d<20){
      if(w.type==="bottle") state.bottles++; else state.bags++;
      return false;
    }
    return true;
  });
  if(wastes.length<5) wastes.push({x:Math.random()*560+20,y:Math.random()*320+20,type:Math.random()>.5?"bottle":"bag"});
  drawSim();
}
drawSim();
setInterval(tickSim,120);

// Simulation tick (data)
setInterval(()=>{
  // battery
  if(state.charging) state.battery = Math.min(100,state.battery+0.6);
  else state.battery = Math.max(0,state.battery-0.15);
  if(state.battery<18) state.charging=true;
  if(state.charging && state.battery>96) state.charging=false;

  state.cleaning = Math.min(100,state.cleaning + Math.random()*0.5);
  state.area = Math.min(state.areaTotal,state.area + Math.random()*8);
  state.speed = +(1.0 + Math.random()*1.2).toFixed(2);
  if(Math.random()>0.7) state.floating++;

  state.obstDist = +(1.5 + Math.random()*8).toFixed(1);
  const r = Math.random();
  state.obstType = r>0.85?"log":r>0.7?"boat":"clear";

  // grid update
  const ai = state.grid.indexOf("active");
  if(ai>=0) state.grid[ai] = "cleaned";
  const pendings = [];
  for(let i=0;i<state.grid.length;i++) if(state.grid[i]==="pending") pendings.push(i);
  if(pendings.length) state.grid[pendings[Math.floor(Math.random()*pendings.length)]] = "active";

  renderUI(); renderGrid();
},1200);

setInterval(pushActivity,2600);

// UI render
function renderUI(){
  const total = state.bottles+state.bags+state.floating;
  $("#kBattery").textContent = state.battery.toFixed(1)+"%";
  $("#kBatteryBar").style.width = state.battery+"%";
  $("#kClean").textContent = state.cleaning.toFixed(1)+"%";
  $("#kCleanBar").style.width = state.cleaning+"%";
  $("#kArea").textContent = Math.round(state.area)+" m²";
  $("#kSpeed").textContent = state.speed+" m/s";
  $("#kWaste").textContent = total;
  $("#kRuntime").textContent = Math.round(state.battery/100*240)+" min";

  $("#hStat1").textContent = total;
  $("#hStat2").textContent = Math.round(state.area/state.areaTotal*100)+"%";
  $("#hStat3").textContent = state.battery.toFixed(0)+"%";
  $("#hStat4").textContent = "12";
  $("#heroSpeed").textContent = state.speed+" m/s";
  $("#heroHeading").textContent = Math.floor(Math.random()*360).toString().padStart(3,"0")+"°";

  // battery ring
  const offset = 314 - (314 * state.battery/100);
  $("#batRing").setAttribute("stroke-dashoffset",offset);
  $("#batPct").textContent = state.battery.toFixed(0)+"%";
  $("#batMode").textContent = state.charging?"Charging":"Discharging";

  // obstacle
  $("#obstDist").textContent = state.obstDist+" m";
  $("#obstType").textContent = state.obstType.toUpperCase();
  $("#obstAct").textContent = state.obstType==="clear"?"Cruise":(state.obstType==="log"?"Avoid":"Slow");
  const ob = $("#obstBadge");
  ob.textContent = state.obstType==="clear"?"CLEAR":"DETECTED";
  ob.style.background = state.obstType==="clear"?"rgba(122,255,198,.12)":"rgba(255,122,138,.18)";
  ob.style.color = state.obstType==="clear"?"var(--mint)":"var(--red)";

  // waste cards
  $("#wBottles").textContent = state.bottles;
  $("#wBags").textContent = state.bags;
  $("#wFloat").textContent = state.floating;
  $("#wBottlesRate").textContent = (state.bottles-state.bottlesPrev);
  $("#wBagsRate").textContent = (state.bags-state.bagsPrev);
  $("#wFloatRate").textContent = (state.floating-state.floatPrev);

  // impact
  $("#imp1").textContent = (total*0.08).toFixed(1)+" kg";
  $("#imp2").textContent = Math.floor(total*0.3);
  $("#imp3").textContent = (60 + state.cleaning*0.3).toFixed(1);
}
setInterval(()=>{
  state.bottlesPrev = state.bottles;
  state.bagsPrev = state.bags;
  state.floatPrev = state.floating;
},60000);
renderUI();

// ===== Charts =====
Chart.defaults.color = "#8aa3bd";
Chart.defaults.borderColor = "rgba(122,216,255,0.08)";
Chart.defaults.font.family = "'Inter',sans-serif";

const labels = Array.from({length:12},(_,i)=>`${i*5}m`);
const histEff = [62,65,68,70,72,74,76,78,80,82,84,86];
const histBat = [100,96,92,88,85,82,80,78,76,74,72,70];
const histWaste = [12,18,22,28,35,42,48,55,60,68,74,82];
const histCov = [4,9,15,22,30,38,46,53,60,66,72,78];

function mkLine(id,data,color,fill){
  return new Chart($(id),{
    type:"line",
    data:{labels:[...labels],datasets:[{data:[...data],borderColor:color,backgroundColor:fill,fill:true,tension:0.4,pointRadius:0,borderWidth:2}]},
    options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:false}}}
  });
}
const chartEff = mkLine("#chartEff",histEff,"#7ad8ff","rgba(122,216,255,0.15)");
const chartBat = mkLine("#chartBat",histBat,"#7affc6","rgba(122,255,198,0.15)");
const chartWaste = new Chart($("#chartWaste"),{
  type:"bar",
  data:{labels:[...labels],datasets:[{data:[...histWaste],backgroundColor:"rgba(255,210,122,0.7)",borderRadius:6}]},
  options:{responsive:true,plugins:{legend:{display:false}}}
});
const chartCov = mkLine("#chartCov",histCov,"#ffd27a","rgba(255,210,122,0.15)");

setInterval(()=>{
  histEff.push(Math.min(100,histEff.at(-1)+(Math.random()*4-1.5))); histEff.shift();
  histBat.push(Math.max(15,histBat.at(-1)+(state.charging?1:-1.2))); histBat.shift();
  histWaste.push(histWaste.at(-1)+Math.random()*4); histWaste.shift();
  histCov.push(Math.min(100,histCov.at(-1)+Math.random()*2)); histCov.shift();
  chartEff.data.datasets[0].data=[...histEff]; chartEff.update("none");
  chartBat.data.datasets[0].data=[...histBat]; chartBat.update("none");
  chartWaste.data.datasets[0].data=[...histWaste]; chartWaste.update("none");
  chartCov.data.datasets[0].data=[...histCov]; chartCov.update("none");
},2200);
