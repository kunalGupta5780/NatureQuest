const form = document.querySelector("#quest-form");
const generateBtn = document.querySelector("#generate-btn");
const resultSection = document.querySelector("#result-section");
const missionList = document.querySelector("#mission-list");
const historyList = document.querySelector("#history-list");
const STORAGE_KEY = "naturequest-history-v1";

let currentQuest = null;

// ------------------------------
// Adventure journal storage
// ------------------------------

function readHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(history.slice(0, 12))
    );
    renderHistory();
  } catch (error) {
    console.error("Could not save the adventure journal:", error);
  }
}

// ------------------------------
// Adventure journal popup
// ------------------------------

function showHistoryModal(entry) {
  const dialog = document.createElement("dialog");
  dialog.className = "history-modal";
  dialog.setAttribute("aria-labelledby", "history-modal-title");

  const panel = document.createElement("div");
  panel.className = "history-modal-panel";

  const header = document.createElement("div");
  header.className = "history-modal-header";

  const heading = document.createElement("h3");
  heading.id = "history-modal-title";
  heading.textContent = entry.title || "Nature Quest";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "history-modal-close";
  closeButton.textContent = "✕";
  closeButton.setAttribute("aria-label", "Close quest details");
  closeButton.addEventListener("click", () => dialog.close());

  header.append(heading, closeButton);
  panel.append(header);

  const meta = document.createElement("p");
  meta.className = "history-modal-meta";
  meta.textContent =
    `${entry.date || "Date unknown"} · ` +
    `${entry.completed || 0}/${entry.total || 0} missions completed`;
  panel.append(meta);

  const status = document.createElement("p");
  status.className = "history-modal-status";
  status.textContent =
    entry.total > 0 && entry.completed === entry.total
      ? "✓ Quest complete"
      : "Quest saved";
  panel.append(status);

  if (entry.intro) {
    const intro = document.createElement("p");
    intro.className = "history-modal-intro";
    intro.textContent = entry.intro;
    panel.append(intro);
  }

  const missionHeading = document.createElement("h4");
  missionHeading.textContent = "Your missions";
  panel.append(missionHeading);

  if (Array.isArray(entry.missions) && entry.missions.length > 0) {
    const list = document.createElement("ul");
    list.className = "history-modal-missions";

    entry.missions.forEach((mission) => {
      const missionText =
        typeof mission === "string" ? mission : mission?.text;

      const completed =
        typeof mission === "string"
          ? false
          : mission?.completed === true;

      const item = document.createElement("li");
      item.className = completed ? "completed" : "";

      const mark = document.createElement("span");
      mark.className = "history-modal-mark";
      mark.textContent = completed ? "✓" : "○";
      mark.setAttribute("aria-hidden", "true");

      const description = document.createElement("span");
      description.textContent =
        missionText || "Mission details unavailable.";

      item.append(mark, description);
      list.append(item);
    });

    panel.append(list);
  } else {
    const note = document.createElement("p");
    note.className = "history-modal-note";
    note.textContent =
      "This quest was saved before mission details were recorded. " +
      "Its original activities are not available in this entry. " +
      "Newly saved quests will include them.";
    panel.append(note);
  }

  if (entry.safety) {
    const safety = document.createElement("p");
    safety.className = "history-modal-extra";
    safety.textContent = `Safety reminder: ${entry.safety}`;
    panel.append(safety);
  }

  if (entry.reflection) {
    const reflection = document.createElement("p");
    reflection.className = "history-modal-extra";
    reflection.textContent = `Reflection: ${entry.reflection}`;
    panel.append(reflection);
  }

  dialog.append(panel);
  document.body.append(dialog);

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  dialog.addEventListener(
    "close",
    () => dialog.remove(),
    { once: true }
  );

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
    dialog.classList.add("history-modal-fallback-open");
  }
}

function renderHistory() {
  const history = readHistory();
  historyList.replaceChildren();

  if (!history.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent =
      "Your saved quests will appear here. Your next discovery is waiting.";

    historyList.append(empty);
    return;
  }

  history.forEach((entry) => {
    const row = document.createElement("article");
    row.className = "history-item";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "history-popup-trigger";
    trigger.setAttribute(
      "aria-label",
      `View details for ${entry.title || "Nature Quest"}`
    );

    const info = document.createElement("span");
    info.className = "history-copy";

    const title = document.createElement("strong");
    title.textContent = entry.title || "Nature Quest";

    const meta = document.createElement("small");
    meta.textContent =
      `${entry.date || "Date unknown"} · ` +
      `${entry.completed || 0}/${entry.total || 0} missions completed`;

    info.append(title, meta);

    const arrow = document.createElement("span");
    arrow.className = "history-popup-arrow";
    arrow.textContent = "↗";
    arrow.setAttribute("aria-hidden", "true");

    trigger.append(info, arrow);
    trigger.addEventListener("click", () => showHistoryModal(entry));

    const status = document.createElement("span");
    status.className = "history-status";
    status.textContent =
      entry.total > 0 && entry.completed === entry.total
        ? "QUEST COMPLETE ✓"
        : "SAVED";

    row.append(trigger, status);
    historyList.append(row);
  });
}

// ------------------------------
// Quest display and completion
// ------------------------------

function renderQuest(quest) {
  currentQuest = quest;

  document.querySelector("#quest-title").textContent =
    quest.title || "Your Nature Quest";

  document.querySelector("#quest-intro").textContent =
    quest.intro || "A small adventure is waiting outside.";

  document.querySelector("#quest-safety").textContent =
    quest.safety ||
    "Stay aware of your surroundings and follow local safety guidance.";

  document.querySelector("#quest-reflection").textContent =
    quest.reflection || "What did you notice?";

  document.querySelector("#source-label").textContent =
    quest.source === "local_model"
      ? "Generated by local Gemma AI"
      : "Starter quest mode · local AI not detected";

  missionList.replaceChildren();

  quest.missions.forEach((mission, index) => {
    const label = document.createElement("label");
    label.className = "mission-card";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.setAttribute(
      "aria-label",
      `Complete mission ${index + 1}`
    );

    const text = document.createElement("p");
    text.textContent = mission;

    checkbox.addEventListener("change", () => {
      label.classList.toggle("done", checkbox.checked);
      updateCompletion();
    });

    label.append(checkbox, text);
    missionList.append(label);
  });

  resultSection.classList.remove("hidden");

  resultSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function updateCompletion() {
  if (!currentQuest) return;

  const checkboxes = [
    ...missionList.querySelectorAll('input[type="checkbox"]')
  ];

  const completed = checkboxes.filter(
    (checkbox) => checkbox.checked
  ).length;

  const key =
    currentQuest.title + "|" + (currentQuest.createdAt || "");

  const history = readHistory().filter(
    (entry) => entry.key !== key
  );

  if (completed > 0) {
    history.unshift({
      key,
      title: currentQuest.title || "Nature Quest",
      date: new Date().toLocaleDateString(),
      completed,
      total: checkboxes.length,
      intro: currentQuest.intro || "",
      safety: currentQuest.safety || "",
      reflection: currentQuest.reflection || "",

      missions: currentQuest.missions.map((mission, index) => ({
        text: mission,
        completed: Boolean(checkboxes[index]?.checked)
      }))
    });
  }

  saveHistory(history);
}

// ------------------------------
// Generate a new outdoor quest
// ------------------------------

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  generateBtn.disabled = true;
  generateBtn.innerHTML = "<span>✧</span> Growing your quest…";

  const values = Object.fromEntries(
    new FormData(form).entries()
  );

  values.minutes = Number(values.minutes);

  try {
    const response = await fetch("/api/quest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    if (!response.ok) {
      throw new Error("Quest request failed");
    }

    const quest = await response.json();
    quest.createdAt = new Date().toISOString();

    renderQuest(quest);
  } catch (error) {
    console.error("Quest generation failed:", error);

    alert(
      "NatureQuest couldn't reach its local server. " +
      "Check that the FastAPI server is running, then try again."
    );
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML =
      '<span>✧</span> Create my nature quest <span class="arrow">↗</span>';
  }
});

document.querySelector("#new-quest").addEventListener("click", () => {
  resultSection.classList.add("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});

document.querySelector("#clear-history").addEventListener("click", () => {
  if (confirm("Clear your saved adventure journal on this browser?")) {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
  }
});

// ------------------------------
// Curiosity Capture
// ------------------------------

const discoverForm = document.querySelector("#discover-form");
const natureImage = document.querySelector("#nature-image");
const previewWrap = document.querySelector("#image-preview-wrap");
const imagePreview = document.querySelector("#image-preview");
const removeImageBtn = document.querySelector("#remove-image");
const discoverBtn = document.querySelector("#discover-btn");
const discoverStatus = document.querySelector("#discover-status");
const discoverResult = document.querySelector("#discover-result");

let previewUrl = null;

function showDiscoveryStatus(message, isError = false) {
  discoverStatus.textContent = message;
  discoverStatus.classList.remove("hidden");
  discoverStatus.classList.toggle("error", isError);
}

function clearImagePreview() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  imagePreview.removeAttribute("src");
  previewWrap.classList.add("hidden");
}

natureImage.addEventListener("change", () => {
  clearImagePreview();

  const file = natureImage.files[0];

  discoverResult.classList.add("hidden");
  discoverStatus.classList.add("hidden");

  if (!file) return;

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    natureImage.value = "";

    showDiscoveryStatus(
      "Please choose a JPG, PNG or WebP image.",
      true
    );
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    natureImage.value = "";

    showDiscoveryStatus(
      "Your photo must be no larger than 5 MB.",
      true
    );
    return;
  }

  previewUrl = URL.createObjectURL(file);
  imagePreview.src = previewUrl;
  previewWrap.classList.remove("hidden");
});

removeImageBtn.addEventListener("click", () => {
  natureImage.value = "";
  clearImagePreview();

  discoverStatus.classList.add("hidden");
  discoverResult.classList.add("hidden");
});

discoverForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const file = natureImage.files[0];

  if (!file) {
    showDiscoveryStatus("Choose a photo first.", true);
    return;
  }

  const formData = new FormData(discoverForm);

  discoverBtn.disabled = true;
  discoverBtn.textContent = "✦ Exploring your discovery…";

  discoverResult.classList.add("hidden");

  showDiscoveryStatus(
    "Your local AI is examining the photo. This may take a little while."
  );

  try {
    const response = await fetch("/api/discover", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Discovery request failed."
      );
    }

    document.querySelector("#discovery-title").textContent =
      data.title || "A curious discovery";

    document.querySelector("#discovery-summary").textContent =
      data.summary || "Here is what the AI noticed in your photo.";

    document.querySelector("#discovery-fact").textContent =
      data.interesting_fact || "Keep observing to learn more.";

    document.querySelector("#discovery-uncertainty").textContent =
      data.uncertainty ||
      "The image may not provide enough detail for identification.";

    document.querySelector("#discovery-quest").textContent =
      data.follow_up_quest ||
      "Spend a few minutes observing your surroundings.";

    const observations = document.querySelector(
      "#discovery-observations"
    );

    observations.replaceChildren();

    if (Array.isArray(data.observations)) {
      data.observations.forEach((observation) => {
        const item = document.createElement("li");
        item.textContent = observation;
        observations.append(item);
      });
    }

    discoverResult.classList.remove("hidden");
    discoverStatus.classList.add("hidden");

    discoverResult.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } catch (error) {
    showDiscoveryStatus(
      error.message ||
      "Couldn't analyse the photo. Check that NatureQuest and Ollama are running.",
      true
    );
  } finally {
    discoverBtn.disabled = false;
    discoverBtn.textContent = "✦ Explore this discovery ↗";
  }
});

// Render saved journal entries when the page loads.
renderHistory();