/* ============================================================
   Fuel · module de données partagé (index.html + stats.html)
   Modèle, stockage local, synchro GitHub, historique.
   ============================================================ */

/* ---- stockage local (localStorage + fallback mémoire) ---- */
const store=(()=>{
  let ok=true;
  try{const k="__t";localStorage.setItem(k,"1");localStorage.removeItem(k);}catch(e){ok=false;}
  const mem={};
  return{
    get:k=>ok?localStorage.getItem(k):(k in mem?mem[k]:null),
    set:(k,v)=>{ok?localStorage.setItem(k,v):mem[k]=v;},
    persistent:ok
  };
})();

/* ---- données de base (calculées précisément, cf. programme) ---- */
const BASE_DATA={
  profil:{taille:"1 m 80",poids:80,age:26},
  depense:[
    {k:"BMR (métabolisme de base)",v:"1800 kcal"},
    {k:"NEAT · 10k pas",v:"400 kcal"},
    {k:"NEAT · autres activités",v:"200 kcal"},
    {k:"EAT · 1h muscu",v:"200 kcal"},
    {k:"TEF · thermogénèse alimentaire",v:"200 kcal"},
  ],
  maintenance:[
    {jour:"Muscu + 10k pas",v:2800},
    {jour:"Repos + 10k pas",v:2600},
    {jour:"Repos total",v:2200},
  ],
  cibleRecomp:[
    {jour:"Muscu + 10k pas",v:2550},
    {jour:"Repos + 10k pas",v:2400},
    {jour:"Repos total",v:2100},
  ],
  totalReel:[
    {jour:"Muscu + 10k pas",kcal:2545,g:327,l:63.8,p:180.7,gp:50,lp:22,pp:28},
    {jour:"Repos + 10k pas",kcal:2411,g:289.2,l:63.5,p:179.6,gp:47,lp:23,pp:30},
    {jour:"Repos total",kcal:2062,g:214.7,l:60.1,p:169.6,gp:41,lp:26,pp:33},
  ],
  besoins:{proteines:"160 à 180 g",lipides:"64 à 70 g",glucides:"le reste"},
};

/* ---- modèle nutritionnel ----
   Glucides = base + 7,5 g / 1000 pas + 38 g si muscu
   Flocons 0->50 g (0->10k pas), pomme de terre = tampon du reste.
   Dépense (maintenance) = 2200 + 40 / 1000 pas + 200 si muscu. */
const M={CARB_PER_1K:7.5,MUSCU_CARB:38,FLOC_CARB_PER_G:0.66,POT_CARB_PER_G:0.17,
  PROT_BASE:170,FAT_BASE:60,OMEGA_FIXED:2.3,
  MAINT_BASE:2200,MAINT_PER_1K:40,MAINT_MUSCU:200,KCAL_PER_KG_FAT:7700};

function compute(steps,muscu,carbBase,weight){
  carbBase=carbBase??215; weight=weight??80;
  const bufferCarb=M.CARB_PER_1K*(steps/1000);
  const flocG=Math.min(50,50*(steps/10000));
  const flocCarb=flocG*M.FLOC_CARB_PER_G;
  const potCarb=Math.max(0,bufferCarb-flocCarb);
  const potG=potCarb/M.POT_CARB_PER_G;
  const carbs=carbBase+bufferCarb+(muscu?M.MUSCU_CARB:0);
  const protein=M.PROT_BASE+flocG*0.13+potG*0.02+(muscu?1.5:0);
  const fat=M.FAT_BASE+flocG*0.07+(muscu?0.4:0);
  const kcal=Math.round(carbs*4+protein*4+fat*9);
  const fibre=Math.round(10+flocG*0.10+potG*0.021+6+4+(muscu?3:0));
  const crea=muscu?5:0;
  const protKg=protein/weight;
  const maintenance=maint(steps,muscu);
  const deficit=maintenance-kcal;
  const deficitPct=deficit/maintenance*100;
  return{carbs,protein,fat,kcal,maintenance,deficit,deficitPct,
    flocG:Math.round(flocG/5)*5,potG:Math.round(potG/10)*10,
    fibre,omega:M.OMEGA_FIXED,crea,protKg};
}
function maint(steps,muscu){return M.MAINT_BASE+M.MAINT_PER_1K*(steps/1000)+(muscu?M.MAINT_MUSCU:0);}

/* ---- historique local ---- */
function getHist(){try{return JSON.parse(store.get("fuel_hist")||"[]");}catch(e){return[];}}
function setHist(h){h.sort((a,b)=>a.date<b.date?-1:1);store.set("fuel_hist",JSON.stringify(h));}
function upsertEntry(entry){
  const h=getHist();
  const i=h.findIndex(e=>e.date===entry.date);
  if(i>=0)h[i]=entry; else h.push(entry);
  setHist(h.slice(-120));
  return getHist();
}
function mergeHists(a,b){
  const map={};
  [...a,...b].forEach(e=>{
    if(!map[e.date]||(e.savedAt||0)>=(map[e.date].savedAt||0))map[e.date]=e;
  });
  return Object.values(map).sort((x,y)=>x.date<y.date?-1:1);
}

/* ---- réglages ---- */
function getSettings(){try{return JSON.parse(store.get("fuel_settings")||"{}");}catch(e){return{};}}
function setSettings(s){store.set("fuel_settings",JSON.stringify(s));}

/* ---- repo par défaut (coordonnées publiques, pas des secrets) ---- */
const DEFAULT_REPO={owner:"Samsamiri",repo:"fuel-",branch:"master",path:"data/history.json"};

/* ---- synchro GitHub (API Contents) ---- */
const Sync={
  cfg(){let s={};try{s=JSON.parse(store.get("fuel_github")||"{}");}catch(e){}return{...DEFAULT_REPO,...s};},
  setCfg(c){store.set("fuel_github",JSON.stringify(c));},
  canRead(){const c=this.cfg();return !!(c.owner&&c.repo);},
  canWrite(){return !!this.cfg().token;},
  enabled(){return this.canWrite();},
  path(){return this.cfg().path||"data/history.json";},
  branch(){return this.cfg().branch||"master";},
  _b64enc(s){return btoa(unescape(encodeURIComponent(s)));},
  _b64dec(s){return decodeURIComponent(escape(atob(s)));},
  _url(){const c=this.cfg();return`https://api.github.com/repos/${c.owner}/${c.repo}/contents/${this.path()}`;},
  _raw(){const c=this.cfg();return`https://raw.githubusercontent.com/${c.owner}/${c.repo}/${this.branch()}/${this.path()}?t=`+Date.now();},
  _headers(){return{"Authorization":"Bearer "+this.cfg().token,"Accept":"application/vnd.github+json"};},
  /* lecture publique, sans token (repo public) */
  async pullPublic(){
    if(!this.canRead())return{ok:false,reason:"repo inconnu"};
    try{
      const r=await fetch(this._raw(),{cache:"no-store"});
      if(r.status===404)return{ok:true,history:[],empty:true};
      if(!r.ok)return{ok:false,reason:"HTTP "+r.status};
      const txt=await r.text();let hist=[];try{hist=JSON.parse(txt);}catch(e){hist=[];}
      return{ok:true,history:hist,public:true};
    }catch(e){return{ok:false,reason:"réseau: "+e.message};}
  },
  /* lecture authentifiée (fraîche, avec sha pour écrire) */
  async pull(){
    if(!this.canWrite())return await this.pullPublic();
    try{
      const r=await fetch(this._url()+"?ref="+this.branch()+"&t="+Date.now(),{headers:this._headers(),cache:"no-store"});
      if(r.status===404)return{ok:true,history:[],sha:null,empty:true};
      if(!r.ok)return{ok:false,reason:"HTTP "+r.status+" (vérifie token/repo/branche)"};
      const j=await r.json();
      const txt=this._b64dec(j.content.replace(/\n/g,""));
      let hist=[];try{hist=JSON.parse(txt);}catch(e){hist=[];}
      return{ok:true,history:hist,sha:j.sha};
    }catch(e){return{ok:false,reason:"réseau: "+e.message};}
  },
  async push(history,sha){
    if(!this.canWrite())return{ok:false,reason:"token manquant sur cet appareil"};
    try{
      const body={message:"maj historique "+todayKey(),content:this._b64enc(JSON.stringify(history,null,2)),branch:this.branch()};
      if(sha)body.sha=sha;
      const r=await fetch(this._url(),{method:"PUT",headers:{...this._headers(),"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(!r.ok){const t=await r.text();return{ok:false,reason:"HTTP "+r.status+" "+t.slice(0,120)};}
      const j=await r.json();return{ok:true,sha:j.content.sha};
    }catch(e){return{ok:false,reason:"réseau: "+e.message};}
  },
  /* charge depuis GitHub (auth si token, sinon public), fusionne, écrit en local */
  async syncIn(){
    const res=await this.pull();
    if(!res.ok)return res;
    const merged=mergeHists(getHist(),res.history||[]);
    setHist(merged);
    return{ok:true,count:merged.length,sha:res.sha,readonly:!this.canWrite(),empty:res.empty};
  },
  /* publie : nécessite le token */
  async syncOut(){
    if(!this.canWrite())return{ok:false,reason:"lecture seule (pas de token)"};
    const pulled=await this.pull();
    if(!pulled.ok)return pulled;
    const merged=mergeHists(getHist(),pulled.history||[]);
    setHist(merged);
    return await this.push(merged,pulled.sha);
  },
  /* détecte la branche par défaut du repo */
  async detectBranch(){
    const c=this.cfg();if(!c.token)return null;
    try{const r=await fetch(`https://api.github.com/repos/${c.owner}/${c.repo}`,{headers:this._headers()});
      if(!r.ok)return null;const j=await r.json();return j.default_branch;}catch(e){return null;}
  }
}

const todayKey=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const nf=n=>Math.round(n).toLocaleString('fr-FR');
