import { periodToFloat } from "../core/course-service.js";
import { PERIODS } from "./render-shell.js";
import { classKey, getRandomColorForClass } from "./ui-utils.js";

export function clearTimetableCells(timetableEl) {
  timetableEl.querySelectorAll(".slot-cell").forEach((cell) => {
    cell.innerHTML = "";
    cell.style.display = "";
    cell.removeAttribute("rowspan");
  });
}

export function renderScheduleOnGrid(timetableEl, schedule) {
  clearTimetableCells(timetableEl);

  schedule.classes.forEach((courseClass) => {
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

    const firstSelector = `.slot-cell[data-day="${day}"][data-period="${periodSlots[0]}"]`;
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
      const selector = `.slot-cell[data-day="${day}"][data-period="${periodSlots[i]}"]`;
      const continuationCell = timetableEl.querySelector(selector);
      if (continuationCell) {
        continuationCell.style.display = "none";
      }
    }
  });
}
