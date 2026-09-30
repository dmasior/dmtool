const form = document.getElementById("password-form");
const lengthInput = document.getElementById("length");
const modeText = document.getElementById("mode");
const status = document.getElementById("status");
const generateButton = document.getElementById("generate");
let currentSettings = null;
let busy = false;

function applySettings(settings) {
  if (currentSettings && settings.revision < currentSettings.revision) return;
  if (!currentSettings) lengthInput.value = String(settings.defaultLength);
  currentSettings = settings;
  lengthInput.min = String(settings.minLength);
  lengthInput.max = String(settings.maxLength);
  document.getElementById("help").textContent = `${settings.minLength}–${settings.maxLength} characters`;
  modeText.textContent = settings.withSymbols
    ? "Letters, digits, and symbols"
    : "Letters and digits · No symbols";
  generateButton.disabled = busy;
  form.setAttribute("aria-busy", String(busy));
}

function showError(message, invalidLength = false) {
  status.textContent = message;
  lengthInput.setAttribute("aria-invalid", String(invalidLength));
  if (invalidLength) lengthInput.focus();
}

const unsubscribe = window.passwordAPI.onSettingsChanged(applySettings);
window.addEventListener("unload", unsubscribe, { once: true });

void window.passwordAPI.getSettings().then((result) => {
  if (!result.ok) throw new Error("Settings unavailable");
  applySettings(result.settings);
  lengthInput.focus();
  lengthInput.select();
}).catch(() => {
  form.setAttribute("aria-busy", "false");
  showError("Could not load settings. Close this window and try again.");
});

lengthInput.addEventListener("input", () => {
  status.textContent = "";
  lengthInput.removeAttribute("aria-invalid");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy || !currentSettings) return;
  const length = lengthInput.valueAsNumber;
  if (!lengthInput.validity.valid || !Number.isInteger(length)
    || length < currentSettings.minLength || length > currentSettings.maxLength) {
    showError(`Enter a whole number from ${currentSettings.minLength} to ${currentSettings.maxLength}.`, true);
    return;
  }

  busy = true;
  generateButton.disabled = true;
  form.setAttribute("aria-busy", "true");
  status.textContent = "";
  try {
    const result = await window.passwordAPI.generateAndCopy(length, currentSettings.revision);
    if (!result.ok) {
      if (result.code === "mode-changed") {
        applySettings(result.settings);
        showError("Character settings changed. Check the mode and generate again.");
      } else if (result.code === "invalid-length") {
        showError(`Enter a whole number from ${currentSettings.minLength} to ${currentSettings.maxLength}.`, true);
      } else {
        showError("Could not generate and copy. Try again.");
      }
    }
  } catch {
    showError("Could not generate and copy. Try again.");
  } finally {
    busy = false;
    generateButton.disabled = !currentSettings;
    form.setAttribute("aria-busy", "false");
  }
});

function cancel() {
  void window.passwordAPI.close().catch(() => {
    showError("Could not close this window. Use the window close button.");
  });
}

document.getElementById("cancel").addEventListener("click", cancel);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    cancel();
  }
});
