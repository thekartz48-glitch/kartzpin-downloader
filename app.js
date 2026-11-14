(() => {
  "use strict";

  const API_BASE_URL = "https://kartzpin-backend.onrender.com";
  const RESOLVE_ENDPOINT = `${API_BASE_URL}/api/resolve`;

  const menuToggle = document.getElementById("menuToggle");
  const nav = document.querySelector(".nav");
  const themeToggle = document.getElementById("themeToggle");
  const form = document.getElementById("downloadForm");
  const urlInput = document.getElementById("pinUrl");
  const pasteButton = document.getElementById("pasteButton");
  const status = document.getElementById("status");

  if (!form || !urlInput || !status) {
    console.error("Kartzpin: required page elements were not found.");
    return;
  }

  function showStatus(message) {
    status.textContent = message;
  }

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
      menuToggle.textContent = isOpen ? "×" : "☰";
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open menu");
        menuToggle.textContent = "☰";
      });
    });
  }

  function setTheme(isDark) {
    document.body.classList.toggle("dark", isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";

    if (themeToggle) {
      themeToggle.textContent = isDark ? "☀" : "☾";
      themeToggle.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
      );
    }

    try {
      localStorage.setItem("kartzpin-theme", isDark ? "dark" : "light");
    } catch (_) {}
  }

  let savedTheme = "light";
  try {
    savedTheme = localStorage.getItem("kartzpin-theme") || "light";
  } catch (_) {}

  setTheme(savedTheme === "dark");

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      setTheme(!document.body.classList.contains("dark"));
    });
  }

  if (pasteButton) {
    pasteButton.addEventListener("click", async () => {
      try {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
          throw new Error("Clipboard unavailable");
        }

        const copiedText = (await navigator.clipboard.readText()).trim();

        if (!copiedText) {
          showStatus("Your clipboard is empty. Copy a Pinterest link first.");
          return;
        }

        urlInput.value = copiedText;
        showStatus("Pinterest link pasted. Press Download to check it.");
      } catch (_) {
        showStatus(
          "Clipboard permission unavailable. Tap the link box, long-press it, and choose Paste."
        );
        urlInput.focus();
      }
    });
  }

  function isAllowedPinterestUrl(value) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" &&
        ["pinterest.com", "www.pinterest.com", "pin.it"].includes(
          parsed.hostname.toLowerCase()
        );
    } catch (_) {
      return false;
    }
  }

  function getErrorMessage(data, fallback) {
    if (typeof data?.detail === "string") return data.detail;

    if (Array.isArray(data?.detail)) {
      return data.detail.map((item) => item.msg).filter(Boolean).join(" ");
    }

    if (typeof data?.message === "string") return data.message;
    return fallback;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const value = urlInput.value.trim();

    if (!value) {
      showStatus("Please paste a Pinterest link first.");
      urlInput.focus();
      return;
    }

    if (!isAllowedPinterestUrl(value)) {
      showStatus("Please enter an HTTPS Pinterest link from pinterest.com or pin.it.");
      urlInput.focus();
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton
      ? submitButton.textContent
      : "Download";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Checking...";
    }

    showStatus("Connecting to KARTZPIN service. Please wait...");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30000);

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
      } catch (_) {
        data = { detail: responseText };
      }

      if (response.status === 501) {
        showStatus(
          "Backend connection successful, but Pinterest processing is not connected yet. No file has been downloaded."
        );
        return;
      }

      if (!response.ok) {
        showStatus(
          getErrorMessage(data, `The service returned an error (${response.status}).`)
        );
        return;
      }

      const downloadUrl =
        data.download_url ||
        data.downloadUrl ||
        data.media_url ||
        data.mediaUrl ||
        data.url;

      if (typeof downloadUrl === "string" && /^https?:\/\//i.test(downloadUrl)) {
        showStatus("The service returned a link. Open it only if you trust the source.");

        let resultLink = document.getElementById("kartzpinResultLink");

        if (!resultLink) {
          resultLink = document.createElement("a");
          resultLink.id = "kartzpinResultLink";
          resultLink.textContent = "Open result";
          resultLink.style.display = "block";
          resultLink.style.marginTop = "12px";
          resultLink.style.fontWeight = "bold";
          status.insertAdjacentElement("afterend", resultLink);
        }

        resultLink.href = downloadUrl;
        resultLink.target = "_blank";
        resultLink.rel = "noopener noreferrer";
      } else {
        showStatus(
          getErrorMessage(data, "The service responded but did not provide a result link.")
        );
      }
    } catch (error) {
      if (error.name === "AbortError") {
        showStatus("The service took too long to respond. Please try again.");
      } else {
        showStatus("Could not connect to the service. Check your internet connection and try again.");
      }
    } finally {
      window.clearTimeout(timeoutId);

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
})();
