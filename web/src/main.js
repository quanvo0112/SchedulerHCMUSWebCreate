import { periodToFloat } from "./core/course-service.js";
import { addClassToSchedule, createStudentSchedule, removeClassFromSchedule } from "./core/schedule-service.js";
import { clearScheduleStorage, loadScheduleFromStorage, saveScheduleToStorage } from "./core/storage-service.js";
import { fetchAvailableCourses } from "./core/available-courses-service.js";
import { PERIODS, renderTimetableShell } from "./ui/render-shell.js";
import { renderAvailableCourses, renderScheduleList } from "./ui/render-tables.js";
import { classKey, getExportFilename, getRandomColorForClass, showStatus } from "./ui/ui-utils.js";
import { MAX_CLASSES_PER_DAY } from "./models/scheduler-models.js";

const state = {
  schedule: createStudentSchedule(),
  editingIndex: -1,
  availableCourses: [],
  availableSearchText: "",
};

function clearTimetableCells(timetableEl) {
  timetableEl.querySelectorAll(".slot-cell").forEach((cell) => {
    cell.innerHTML = "";
    cell.style.display = "";
    cell.removeAttribute("rowspan");
  });
}

function renderScheduleOnGrid(timetableEl) {
  clearTimetableCells(timetableEl);

  state.schedule.classes.forEach((courseClass) => {
    const day = Number(courseClass.classSchedule.dayOfWeek);
    const periodStartFloat = periodToFloat(courseClass.classSchedule.periodStart);
    const periodEndFloat = periodToFloat(courseClass.classSchedule.periodEnd);
    const slotColor = getRandomColorForClass(classKey(courseClass));

    const periodSlots = PERIODS.filter(
      (period) => period >= periodStartFloat && period <= periodEndFloat
    );

    if (periodSlots.length === 0) {
      return;
    }

    const firstSelector = `.slot-cell[data-day=\"${day}\"][data-period=\"${periodSlots[0]}\"]`;
    const firstCell = timetableEl.querySelector(firstSelector);
    if (!firstCell) {
      return;
    }

    firstCell.setAttribute("rowspan", String(periodSlots.length));
    firstCell.innerHTML = `
      <article class="slot-card" style="--slot-color:${slotColor};">
        <strong>${courseClass.courseName}</strong>
        <small>${courseClass.classId} | ${courseClass.location || "TBA"}</small>
        <small>T${day} | ${periodStartFloat} - ${periodEndFloat}</small>
      </article>
    `;

    for (let i = 1; i < periodSlots.length; i += 1) {
      const selector = `.slot-cell[data-day=\"${day}\"][data-period=\"${periodSlots[i]}\"]`;
      const continuationCell = timetableEl.querySelector(selector);
      if (continuationCell) {
        continuationCell.style.display = "none";
      }
    }
  });
}

function saveAndRender(timetableEl, listEl, availableListEl) {
  saveScheduleToStorage(state.schedule);
  renderScheduleOnGrid(timetableEl);
  renderScheduleList(listEl, state.schedule);
  renderAvailableCourses(availableListEl, state.availableCourses, state.schedule, state.availableSearchText);
}

function canAddInDay(schedule, dayOfWeek) {
  const sameDayCount = schedule.classes.filter(
    (item) => Number(item.classSchedule.dayOfWeek) === Number(dayOfWeek)
  ).length;
  return sameDayCount < MAX_CLASSES_PER_DAY;
}

async function exportTimetableToPNG() {
  const timetableContainerEl = document.getElementById("timetable-container");
  if (!timetableContainerEl) {
    throw new Error("Timetable container not found");
  }

  if (!window.domtoimage || typeof window.domtoimage.toPng !== "function") {
    throw new Error("PNG export is unavailable because dom-to-image-more is not loaded");
  }

  const imageDataUrl = await window.domtoimage.toPng(timetableContainerEl, {
    bgcolor: "#ffffff",
  });

  const link = document.createElement("a");
  link.href = imageDataUrl;
  link.download = getExportFilename("png");
  link.click();
}



function bootstrapStep3UI() {
  if (typeof document === "undefined") {
    return;
  }

  state.schedule = loadScheduleFromStorage();

  const statusEl = document.getElementById("formStatus");
  const exportBtnEl = document.getElementById("exportScheduleBtn");
  const importBtnEl = document.getElementById("importScheduleBtn");
  const exportPngBtnEl = document.getElementById("btn-export-png");
  const importFileEl = document.getElementById("importScheduleFile");
  const clearBtnEl = document.getElementById("clearScheduleBtn");
  const availableSearchEl = document.getElementById("availableSearch");
  const availableStatusEl = document.getElementById("availableStatus");
  const availableListEl = document.getElementById("availableCourses");
  const listEl = document.getElementById("selectedClasses");
  const timetableEl = document.getElementById("timetable");

  if (
    !statusEl ||
    !exportBtnEl ||
    !importBtnEl ||
    !exportPngBtnEl ||
    !importFileEl ||
    !clearBtnEl ||
    !availableSearchEl ||
    !availableStatusEl ||
    !availableListEl ||
    !listEl ||
    !timetableEl
  ) {
    throw new Error("UI boot failed: missing required DOM nodes");
  }

  renderTimetableShell(timetableEl);

  saveAndRender(timetableEl, listEl, availableListEl);

  fetchAvailableCourses()
    .then((courses) => {
      state.availableCourses = courses;
      renderAvailableCourses(
        availableListEl,
        state.availableCourses,
        state.schedule,
        state.availableSearchText
      );
      showStatus(availableStatusEl, `Loaded ${courses.length} available courses from JSON`, "ok");
    })
    .catch((error) => {
      showStatus(availableStatusEl, error.message || "Unable to load available courses", "warn");
      renderAvailableCourses(
        availableListEl,
        state.availableCourses,
        state.schedule,
        state.availableSearchText
      );
    });



  listEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const removeIndex = target.dataset.removeIndex;
    if (typeof removeIndex !== "string") {
      return;
    }

    const index = Number(removeIndex);
    const item = state.schedule.classes[index];
    if (!item) {
      showStatus(statusEl, "Class no longer exists", "warn");
      return;
    }

    removeClassFromSchedule(state.schedule, item);
    saveAndRender(timetableEl, listEl, availableListEl);
    showStatus(statusEl, "Class removed", "ok");
  });

  exportBtnEl.addEventListener("click", () => {
    const jsonString = JSON.stringify(state.schedule, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const filename = getExportFilename("json");

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    showStatus(statusEl, `Exported to ${filename}`, "ok");
  });

  importBtnEl.addEventListener("click", () => {
    importFileEl.click();
  });

  exportPngBtnEl.addEventListener("click", async () => {
    try {
      await exportTimetableToPNG();
      showStatus(statusEl, "Exported timetable as PNG", "ok");
    } catch (error) {
      showStatus(statusEl, error.message || "Failed to export timetable as PNG", "warn");
    }
  });

  importFileEl.addEventListener("change", async () => {
    const file = importFileEl.files?.[0];
    if (!file) {
      return;
    }

    try {
      const jsonText = await file.text();
      const imported = JSON.parse(jsonText);

      if (!imported.classes || !Array.isArray(imported.classes)) {
        throw new Error("Invalid schedule format: missing classes array");
      }

      state.schedule = imported;
      saveAndRender(timetableEl, listEl, availableListEl);
      showStatus(statusEl, `Imported ${imported.classes.length} courses from ${file.name}`, "ok");
    } catch (error) {
      showStatus(statusEl, error.message || "Failed to import schedule", "warn");
    } finally {
      importFileEl.value = "";
    }
  });

  clearBtnEl.addEventListener("click", () => {
    state.schedule = createStudentSchedule();
    clearScheduleStorage();
    saveAndRender(timetableEl, listEl, availableListEl);
    showStatus(statusEl, "Schedule cleared", "ok");
  });

  availableSearchEl.addEventListener("input", () => {
    state.availableSearchText = availableSearchEl.value;
    renderAvailableCourses(
      availableListEl,
      state.availableCourses,
      state.schedule,
      state.availableSearchText
    );
  });

  availableListEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const addKey = target.dataset.addKey;
    if (!addKey) {
      return;
    }

    const selectedClass = state.availableCourses.find((item) => classKey(item) === addKey);
    if (!selectedClass) {
      showStatus(statusEl, "Selected course no longer exists in source list", "warn");
      return;
    }

    if (!canAddInDay(state.schedule, selectedClass.classSchedule.dayOfWeek)) {
      showStatus(statusEl, `Maximum ${MAX_CLASSES_PER_DAY} classes reached for this day`, "warn");
      return;
    }

    const addResult = addClassToSchedule(state.schedule, selectedClass);
    if (!addResult.added) {
      showStatus(statusEl, "Cannot add class due to time conflict", "warn");
      return;
    }

    saveAndRender(timetableEl, listEl, availableListEl);
    showStatus(statusEl, "Class added from available list", "ok");
  });
}

bootstrapStep3UI();
