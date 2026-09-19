const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const previewWrap = document.getElementById("previewWrap");
const preview = document.getElementById("preview");
const changeBtn = document.getElementById("changeBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusEl = document.getElementById("status");
const result = document.getElementById("result");
const downloadBtn = document.getElementById("downloadBtn");
const canvas = document.getElementById("comicCanvas");

let selectedFile = null;
let selectedDataUrl = null;

dropzone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});

["dragenter", "dragover"].forEach(type => {
  dropzone.addEventListener(type, e => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach(type => {
  dropzone.addEventListener(type, e => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", e => {
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
});

changeBtn.addEventListener("click", () => fileInput.click());

function setFile(file) {
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    setStatus("Please choose a JPEG or PNG image.");
    return;
  }

  if (file.size > 8 * 1024 * 1024) {
    setStatus("That image is larger than 8 MB.");
    return;
  }

  selectedFile = file;
  const reader = new FileReader();

  reader.onload = () => {
    selectedDataUrl = reader.result;
    preview.src = selectedDataUrl;
    previewWrap.classList.remove("hidden");
    analyzeBtn.disabled = false;
    setStatus("Photo loaded. Ready for the editor.");
  };

  reader.readAsDataURL(file);
}

function setStatus(message) {
  statusEl.textContent = message;
}

analyzeBtn.addEventListener("click", async () => {
  if (!selectedDataUrl) return;

  analyzeBtn.disabled = true;
  setStatus("J. Jonah Jameson is inspecting the evidence...");

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: selectedDataUrl })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Analysis failed.");
    }

    renderResult(data);
    drawComic(selectedDataUrl, data);
    result.classList.remove("hidden");
    setStatus("VERDICT IN. The Daily Bugle has spoken.");
  } catch (error) {
    setStatus(error.message);
  } finally {
    analyzeBtn.disabled = false;
  }
});

function renderResult(data) {
  document.getElementById("headline").textContent = data.headline;
  document.getElementById("overallScore").textContent = data.overall_score;
  document.getElementById("verdict").textContent = data.verdict;

  setCriterion("lighting", data.lighting);
  setCriterion("focus", data.focus);
  setCriterion("framing", data.framing);

  document.getElementById("quote").textContent = `"${data.jameson_quote}"`;
}

function setCriterion(name, item) {
  document.getElementById(`${name}Score`).textContent = `${item.score}/100`;
  document.getElementById(`${name}Comment`).textContent = item.comment;
  document.getElementById(`${name}Bar`).style.width = `${item.score}%`;
}

function drawComic(dataUrl, data) {
  const img = new Image();

  img.onload = () => {
    const maxWidth = 1100;
    const scale = Math.min(1, maxWidth / img.width);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    canvas.width = w;
    canvas.height = h + 130;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const px = imageData.data;

    for (let i = 0; i < px.length; i += 4) {
      const gray = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      const value = gray > 150 ? 255 : 35;
      px[i] = value;
      px[i + 1] = value;
      px[i + 2] = value;
    }

    ctx.putImageData(imageData, 0, 0);

    ctx.fillStyle = "#ffd83d";
    ctx.fillRect(0, h, w, 130);

    ctx.strokeStyle = "#111";
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, w, canvas.height);

    ctx.fillStyle = "#111";
    ctx.font = "bold 26px Impact, Arial Black, sans-serif";
    ctx.fillText("DAILY BUGLE PHOTO DESK", 22, h + 38);

    ctx.font = "bold 18px Georgia, serif";
    const headline = String(data.headline || "PHOTO REVIEW").slice(0, 70);
    ctx.fillText(headline, 22, h + 68);

    ctx.font = "bold 17px Arial, sans-serif";
    ctx.fillText(`SCORE: ${data.overall_score}/100`, 22, h + 100);
  };

  img.src = dataUrl;
}

downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "daily-bugle-comic.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});