// Shared: API base, escaping, session helpers. Load after features.js, before page scripts.

const API = location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:8787"
    : "https://antisslopedi-server.yusufmertturan.workers.dev";

function escHtml(s){
    if(!s) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function initials(name){
    return name.split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toLocaleUpperCase("tr");
}

function getToken(){
    return localStorage.getItem("antisslopedi_token");
}

function getUserInfo(){
    try{ return JSON.parse(localStorage.getItem("antisslopedi_user")); }catch(e){ return null; }
}

function setSession(token, user){
    localStorage.setItem("antisslopedi_token", token);
    localStorage.setItem("antisslopedi_user", JSON.stringify(user));
}

function clearSession(){
    localStorage.removeItem("antisslopedi_token");
    localStorage.removeItem("antisslopedi_user");
}

function authHeaders(){
    const t = getToken();
    return t ? { "Authorization": "Bearer " + t } : {};
}

async function logout(){
    try{ await fetch(API + "/api/auth/logout", { method: "POST", headers: authHeaders() }); }catch(e){}
    clearSession();
    location.href = "index.html";
}

function renderAuthStrip(){
    const el = document.getElementById("auth-strip");
    if(!el) return;
    const user = getUserInfo();
    if(getToken() && user){
        el.innerHTML = `<span class="straightText">${escHtml(user.username)}</span><a href="#" onclick="logout();return false;">çıkış</a>`;
    }else{
        el.innerHTML = `<a href="giris.html">giriş yap</a>`;
    }
}

renderAuthStrip();
