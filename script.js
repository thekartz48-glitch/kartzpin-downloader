const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
const themeToggle = document.getElementById("themeToggle");
const form = document.getElementById("downloadForm");
const urlInput = document.getElementById("pinUrl");
const pasteBtn = document.getElementById("pasteBtn");
const statusMessage = document.getElementById("statusMessage");

const API_BASE_URL = "https://kartzpin-backend.onrender.com";
const RESOLVE_ENDPOINT = `${API_BASE_URL}/api/resolve`;

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
    statusMessage.textContent = "Link pasted. Press Download to process it.";
  } catch {
    statusMessage.textContent = "Clipboard access is unavailable here. Long-press the box and choose Paste.";
    urlInput.focus();
  }
});

function isPinterestLink(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;

    const host = parsed.hostname.toLowerCase();
    return host === "pin.it" ||
      host.endsWith(".pin.it") ||
      /(^|\.)pinterest\.[a-z.]+$/i.test(host);
  } catch {
    return false;
  }
}

function getErrorMessage(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) {
    return data.detail.map(item => item.msg).filter(Boolean).join(" ");
  }
  if (typeof data?.message === "string") return data.message;
  return fallback;
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  const value = urlInput.value.trim();

  if (!value) {
    statusMessage.textContent = "Please paste a Pinterest link first.";
    urlInput.focus();
    return;
  }

  if (!isPinterestLink(value)) {
    statusMessage.textContent = "Please enter a valid public Pinterest link (pinterest.com or pin.it).";
    urlInput.focus();
    return;
  }

  const submitButton = form.querySelector('[type="submit"]');
  const originalButtonText = submitButton ? submitButton.textContent : "";

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Processing...";
  }
  statusMessage.textContent = "Connecting to KARTZPIN download service. Please wait...";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(RESOLVE_ENDPOINT, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: value }),
      signal: controller.signal
    });

    const responseText = await response.text();
    let data = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { detail: responseText };
    }

    if (!response.ok) {
      if (response.status === 501) {
        statusMessage.textContent =
          "The backend received your link, but Pinterest processing is not implemented yet. The download service still needs to be completed.";
      } else {
        statusMessage.textContent = getErrorMessage(
          data,
          `The download service returned an error (${response.status}). Please try again later.`
        );
      }
      return;
    }

    const downloadUrl =
      data.download_url ||
      data.downloadUrl ||
      data.media_url ||
      data.mediaUrl ||
      data.url;

    if (downloadUrl && /^https?:\/\//i.test(downloadUrl)) {
      statusMessage.textContent = "Your link was processed. Tap the download link below.";
      let resultLink = document.getElementById("kartzpinResultLink");
      if (!resultLink) {
        resultLink = document.createElement("a");
        resultLink.id = "kartzpinResultLink";
        resultLink.style.display = "block";
        resultLink.style.marginTop = "12px";
        resultLink.style.fontWeight = "bold";
        resultLink.textContent = "Open download";
        statusMessage.insertAdjacentElement("afterend", resultLink);
      }
      resultLink.href = downloadUrl;
      resultLink.target = "_blank";
      resultLink.rel = "noopener noreferrer";
    } else {
      statusMessage.textContent = getErrorMessage(
        data,
        "The server responded, but did not provide a downloadable media link."
      );
    }
  } catch (error) {
    if (error.name === "AbortError") {
      statusMessage.textContent = "The server took too long to respond. Please try again in a moment.";
    } else {
      statusMessage.textContent =
        "Could not connect to the download service. Please check your internet connection and try again.";
    }
  } finally {
    clearTimeout(timeoutId);
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText || "Download";
    }
  }
});

document.getElementById("year").textContent = new Date().getFullYear();
