let colorScheme = localStorage.getItem("theme");

if(colorScheme !== "dark" && colorScheme !== "light"){
    colorScheme = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    localStorage.setItem("theme", colorScheme);
}

applyColorScheme();

function switchColorScheme(){
    colorScheme = (colorScheme === "dark") ? "light" : "dark";
    localStorage.setItem("theme", colorScheme);
    applyColorScheme();
}

function applyColorScheme(){
    document.body.classList.toggle("dark", colorScheme === "dark");
    const btn = document.getElementById("darkModeButton");
    if(btn) btn.textContent = (colorScheme === "dark") ? "☀️" : "🌙";
}
