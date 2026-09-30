// Farbschema der Demo über ?theme= (plain, psi, psi-dark, …)
(function () {
    var theme = new URLSearchParams(location.search).get("theme") || "plain";
    if (theme !== "plain") document.body.classList.add("theme-" + theme.replace("-dark", ""));
    if (/dark$/.test(theme)) document.body.classList.add("dark");
})();
