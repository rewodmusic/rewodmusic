const CONFIG = {
  dataUrl: "/data/admin.json",
  kofiUrl: "https://ko-fi.com/rewodmusic",
  signatureUrl: "/img/signature.png",

  images: {
    latest: "/img/latest.jpg",
    original: "/img/profile_original.jpg",
    feat: "/img/profile_feat.jpg",
    tape: "/img/profile_tape.jpg",
    default: "/img/profile.jpg"
  }
};

function safe(s){return (s??"").toString().trim();}
function norm(s){
  return safe(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .toLowerCase().replace(/[^a-z0-9]+/g,"");
}
function slug(s){
  return norm(s).replace(/^-+|-+$/g,"");
}

async function initSong(){
  const img = document.getElementById("latestCover");

  const res = await fetch(CONFIG.dataUrl,{cache:"no-store"});
  const data = await res.json();
  if(!Array.isArray(data)||!data.length) return;

  const latestRow = data[0];

  const q = new URLSearchParams(location.search).get("id");
  const wanted = norm(q);

  let row = data.find(r =>
    norm(r.id)===wanted ||
    norm(slug(r.newmusicartist)+slug(r.newmusictitle))===wanted
  ) || latestRow;

  // ---- IMAGE DECISION ----
  let imgSrc = CONFIG.images.default;

  const isLatest =
    norm(slug(row.newmusicartist)+slug(row.newmusictitle)) ===
    norm(slug(latestRow.newmusicartist)+slug(latestRow.newmusictitle));

  if(isLatest){
    imgSrc = CONFIG.images.latest;
  } else if(safe(row.tape).toLowerCase()==="x"){
    imgSrc = CONFIG.images.tape;
  } else if(safe(row.feat)){
    imgSrc = CONFIG.images.feat;
  } else if(safe(row.newmusicartist).toLowerCase()==="original composition"){
    imgSrc = CONFIG.images.original;
  }

  img.src = imgSrc;
  img.alt = "REWOD visual";

  // ---- TITLE ----
  const title = row.feat
    ? `REWOD ft. ${row.feat} – ${row.newmusictitle}`
    : `REWOD – ${row.newmusictitle}`;

  document.getElementById("latestTitle").textContent = title;
  document.title = title;

  // ---- LINKS ----
  const set = (id,url)=>{
    const b=document.getElementById(id);
    if(!b)return;
    if(url){
      b.href=url;b.target="_blank";b.style.opacity="1";
    }else{
      b.style.opacity="0.4";b.style.pointerEvents="none";
    }
  };

  set("btnSpotify",row.spotifyurl);
  set("btnApple",row.appleurl);
  set("btnYouTube",row.youtubeurl);
  set("btnMMS",row.mymusicurl);

  const k=document.getElementById("btnKofi");
  k.href=CONFIG.kofiUrl;k.target="_blank";

  // ---- DESCR ----
  if(row.descr){
    const d=document.getElementById("latestDescr");
    d.hidden=false;
    document.getElementById("latestDescrText").textContent=`"${row.descr}"`;
    document.getElementById("latestSignature").src=CONFIG.signatureUrl;
  }
}

initSong().catch(console.error);