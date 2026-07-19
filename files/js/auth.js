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

function charCard(char){
    const imgHtml = char.image
        ? `<img src="${escHtml(char.image)}" alt="${escHtml(char.name)}">`
        : `<div class="char-card-placeholder">${escHtml(initials(char.name))}</div>`;
    const card = document.createElement("a");
    card.href = `wiki.html?char=${encodeURIComponent(char.id)}`;
    card.className = "char-card";
    card.innerHTML = `
        <div class="char-card-img">${imgHtml}</div>
        <div class="char-card-info">
            <h3>${escHtml(char.name)}</h3>
            <p class="char-card-summary">${escHtml(char.summary || "")}</p>
        </div>
    `;
    return card;
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

function canEditRole(){
    const u = getUserInfo();
    return !!getToken() && !!u && (u.role === "admin" || u.role === "editor");
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
        let html = `<a href="kullanici.html?u=${encodeURIComponent(user.username)}">${escHtml(user.username)}</a>`;
        if(user.role === "admin") html += `<a href="yonetim.html">yönetim</a>`;
        html += `<a href="#" onclick="logout();return false;">çıkış</a>`;
        el.innerHTML = html;
    }else{
        el.innerHTML = `<a href="giris.html">giriş yap</a>`;
    }
}

renderAuthStrip();
