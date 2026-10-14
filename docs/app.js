const state = {
  results: [],
  filtered: []
};

const elements = {
  search: document.getElementById("search"),
  classFilter: document.getElementById("class-filter"),
  planetFilter: document.getElementById("planet-filter"),
  resonanceFilter: document.getElementById("resonance-filter"),
  resultFilter: document.getElementById("result-filter"),
  reset: document.getElementById("reset-filters"),
  body: document.getElementById("results-body"),
  visibleCount: document.getElementById("visible-count"),
  emptyState: document.getElementById("empty-state"),
  errorState: document.getElementById("error-state"),
  modal: document.getElementById("plot-modal"),
  modalImage: document.getElementById("modal-image"),
  modalClose: document.getElementById("modal-close")
};

function normalise(value) {
  return String(value ?? "").trim();
}

function uniqueSorted(values) {
  return [...new Set(values.map(normalise).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function fillSelect(select, values) {
  const firstLabel = select.options[0].textContent;
  select.innerHTML = `<option value="">${firstLabel}</option>`;

  for (const value of uniqueSorted(values)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
}

function populateFilters(results) {
  fillSelect(elements.classFilter, results.map(row => row.class));
  fillSelect(elements.planetFilter, results.map(row => row.planet));
  fillSelect(elements.resonanceFilter, results.map(row => row.resonance));
  fillSelect(elements.resultFilter, results.map(row => row.result));
}

function matchesSearch(row, query) {
  if (!query) return true;

  const searchable = [
    row.object,
    row.spkid,
    row.case_id,
    row.class,
    row.resonance,
    row.planet,
    row.result
  ]
    .map(normalise)
    .join(" ")
    .toLowerCase();

  return searchable.includes(query);
}

function applyFilters() {
  const query = elements.search.value.trim().toLowerCase();

  state.filtered = state.results.filter(row => (
    matchesSearch(row, query) &&
    (!elements.classFilter.value ||
      normalise(row.class) === elements.classFilter.value) &&
    (!elements.planetFilter.value ||
      normalise(row.planet) === elements.planetFilter.value) &&
    (!elements.resonanceFilter.value ||
      normalise(row.resonance) === elements.resonanceFilter.value) &&
    (!elements.resultFilter.value ||
      normalise(row.result) === elements.resultFilter.value)
  ));

  renderTable();
}

function createCell(text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = normalise(text);

  if (className) {
    cell.className = className;
  }

  return cell;
}

function renderTable() {
  elements.body.replaceChildren();

  for (const row of state.filtered) {
    const tr = document.createElement("tr");

    tr.appendChild(createCell(row.object, "object-cell"));
    tr.appendChild(createCell(row.class, "mono"));
    tr.appendChild(createCell(row.resonance, "mono"));
    tr.appendChild(createCell(row.planet));
    tr.appendChild(createCell(row.result, "result"));

    const plotCell = document.createElement("td");

    if (normalise(row.plot)) {
      const link = document.createElement("a");

      const plotPath = `plots/${encodeURIComponent(normalise(row.plot))}`;

      link.href = plotPath;
      link.className = "plot-link";
      link.textContent = "View";

      link.addEventListener("click", event => {
      event.preventDefault();

      elements.modalImage.src = plotPath;
      elements.modalImage.alt =
          `Resonance plot for ${normalise(row.object)}`;

      elements.modal.classList.add("open");
      elements.modal.setAttribute("aria-hidden", "false");
      });

      link.setAttribute(
        "aria-label",
        `View resonance plot for ${normalise(row.object)}`
      );

      plotCell.appendChild(link);
    } else {
      plotCell.textContent = "—";
    }

    tr.appendChild(plotCell);
    elements.body.appendChild(tr);
  }

  elements.visibleCount.textContent = state.filtered.length;
  elements.emptyState.hidden = state.filtered.length !== 0;
}

function resetFilters() {
  elements.search.value = "";
  elements.classFilter.value = "";
  elements.planetFilter.value = "";
  elements.resonanceFilter.value = "";
  elements.resultFilter.value = "";

  applyFilters();
}

function closeModal() {
  elements.modal.classList.remove("open");
  elements.modal.setAttribute("aria-hidden", "true");

  elements.modalImage.src = "";
}

function bindControls() {
  elements.search.addEventListener("input", applyFilters);
  elements.classFilter.addEventListener("change", applyFilters);
  elements.planetFilter.addEventListener("change", applyFilters);
  elements.resonanceFilter.addEventListener("change", applyFilters);
  elements.resultFilter.addEventListener("change", applyFilters);
  elements.reset.addEventListener("click", resetFilters);
  elements.modalClose.addEventListener("click", closeModal);
  elements.modal.addEventListener("click", event => {
    if (event.target === elements.modal) {
      closeModal();
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeModal();
    }
  });
}

async function loadResults() {
  try {
    const response = await fetch("data/results.json");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("results.json does not contain an array.");
    }

    state.results = data;
    state.filtered = data;

    populateFilters(data);
    renderTable();

  } catch (error) {
    console.error("Could not load resonance results:", error);

    elements.errorState.hidden = false;
    elements.visibleCount.textContent = "0";
  }
}

bindControls();
loadResults();