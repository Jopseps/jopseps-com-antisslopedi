let colorScheme;
let savedTheme = localStorage.getItem("theme");

if(savedTheme !== "dark" && savedTheme !== "light"){
    if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){
        colorScheme = "dark";
    }else{
        colorScheme = "light";
    }
    localStorage.setItem("theme", colorScheme);
    savedTheme = colorScheme;
}else{
    colorScheme = savedTheme;
}

applyColorScheme();

function switchColorScheme(){
    colorScheme = (colorScheme === "dark") ? "light" : "dark";
    savedTheme = colorScheme;
    localStorage.setItem("theme", savedTheme);
    applyColorScheme();
}

function applyColorScheme(){
    let siteFooter = document.getElementById("footer");

    document.querySelector(".background").style.backgroundColor = (colorScheme === "dark") ? "rgb(30, 30, 30)" : "rgb(187, 187, 187)";
    document.getElementById("darkModeButton").innerHTML = (colorScheme === "dark") ? "light mode" : "dark mode";

    let allTexts = document.querySelectorAll("p, .straightText, .interactiveText, h1, h2, h3, li, span");
    allTexts.forEach(el => {
        if(
            !siteFooter.contains(el) &&
            !el.classList.contains("noDarkMode") &&
            !el.parentElement.classList.contains("noDarkMode") &&
            !el.parentElement.parentElement.classList.contains("noDarkMode")
        ){
            el.style.color = (colorScheme === "dark") ? "white" : "black";
        }
    });

    document.querySelectorAll(".project-card, .project-card-P, .char-card").forEach(card => {
        card.style.backgroundColor = (colorScheme === "dark") ? "rgb(50, 50, 50)" : "rgb(255, 255, 255)";
        card.style.borderColor = (colorScheme === "dark") ? "rgb(255, 255, 255)" : "rgb(204, 204, 204)";
    });

    document.querySelectorAll(".char-card .char-card-summary").forEach(p => {
        p.style.color = (colorScheme === "dark") ? "rgb(200, 200, 200)" : "rgb(85, 85, 85)";
    });

    document.querySelectorAll(".wiki-toc, .wiki-infobox").forEach(box => {
        box.style.backgroundColor = (colorScheme === "dark") ? "rgb(50, 50, 50)" : "rgb(255, 255, 255)";
        box.style.borderColor = (colorScheme === "dark") ? "rgb(100, 100, 100)" : "rgb(204, 204, 204)";
    });

    document.querySelectorAll(".wiki-badge").forEach(badge => {
        badge.style.backgroundColor = (colorScheme === "dark") ? "rgb(60, 60, 60)" : "rgb(240, 240, 240)";
        badge.style.borderColor = (colorScheme === "dark") ? "rgb(150, 150, 150)" : "rgb(200, 200, 200)";
        badge.style.color = (colorScheme === "dark") ? "white" : "black";
    });

    document.querySelectorAll(".wiki-section h2").forEach(h => {
        h.style.borderBottomColor = (colorScheme === "dark") ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
    });

    document.querySelectorAll(".wiki-initials-placeholder").forEach(pl => {
        pl.style.color = (colorScheme === "dark") ? "white" : "black";
    });
}
