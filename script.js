const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
const themeToggle = document.getElementById("themeToggle");
const form = document.getElementById("downloadForm");
const urlInput = document.getElementById("pinUrl");
const pasteBtn = document.getElementById("pasteBtn");
const statusMessage = document.getElementById("statusMessage");

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.textContent = isOpen ? "×" : "☰";
});

mainNav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.textContent = "☰";
}));

function applyTheme(dark) {
  document.body.classList.toggle("dark", dark);
  themeToggle.textContent = dark ? "☀" : "☾";
  themeToggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  localStorage.setItem("kartzpin-theme", dark ? "dark" : "light");
}
applyTheme(localStorage.getItem("kartzpin-theme") === "dark");
themeToggle.addEventListener("click", () => applyTheme(!document.body.classList.contains("dark")));

pasteBtn.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) throw new Error("empty");
    urlInput.value = text.trim();
    statusMessage.textContent = "Link pasted. Press Download to check it.";
  } catch {
    statusMessage.textContent = "Clipboard access is unavailable here. Long-press the box and choose Paste.";
    urlInput.focus();
  }
});

form.addEventListener("submit", event => {
  event.preventDefault();
  const value = urlInput.value.trim();
  if (!value) {
    statusMessage.textContent = "Please paste a Pinterest link first.";
    urlInput.focus();
    return;
  }
  let parsed;
  try { parsed = new URL(value); } catch {
    statusMessage.textContent = "That does not look like a valid web link. Please check it.";
    return;
  }
  if (!/(^|\\.)pinterest\\.[a-z.]+$/i.test(parsed.hostname)) {
    statusMessage.textContent = "Please enter a public Pinterest link.";
    return;
  }
  statusMessage.textContent = "Your link looks valid. The download service is not connected yet, so no file has been downloaded.";
});

document.getElementById("year").textContent = new Date().getFullYear();
