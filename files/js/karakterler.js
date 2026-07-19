// API, escHtml, initials, charCard come from auth.js (loaded first)

let allChars = [];

async function loadAll(){
    try{
        const res = await fetch(`${API}/api/characters`);
        if(!res.ok) throw new Error(res.status);
        allChars = await res.json();
    }catch(e){
        document.getElementById("loading-msg").textContent = "Yüklenemedi.";
        return;
    }
    renderChars(allChars);
}

function renderChars(chars){
    const grid = document.getElementById("char-grid");
    grid.innerHTML = "";
    if(!chars.length){
        grid.innerHTML = `<p class="straightText" style="font-size:large;">Sonuç yok.</p>`;
        return;
    }
    chars.forEach(c => grid.appendChild(charCard(c)));
}

function filterChars(){
    const q = document.getElementById("char-search").value.trim().toLocaleLowerCase("tr");
    if(!q){
        renderChars(allChars);
        return;
    }
    renderChars(allChars.filter(c =>
        c.name.toLocaleLowerCase("tr").includes(q) ||
        (c.summary || "").toLocaleLowerCase("tr").includes(q)
    ));
}

loadAll();
