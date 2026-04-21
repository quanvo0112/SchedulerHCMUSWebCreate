import { filterAvailableCourses } from "../core/available-courses-service.js";
import { periodToFloat } from "../core/course-service.js";
import { classIdentity, classKey } from "./ui-utils.js";

export function renderScheduleList(listEl, schedule) {
  if (schedule.classes.length === 0) {
    listEl.innerHTML = '<p class="available-empty">No courses selected yet. Browse available courses above.</p>';
    return;
  }

  const rowsHtml = schedule.classes
    .map(
      (item, index) =>
        `<tr class="selected-row">
          <td><strong>${item.courseId}</strong></td>
          <td>${item.classId}</td>
          <td>${item.courseName}</td>
          <td>T${item.classSchedule.dayOfWeek}</td>
          <td>${periodToFloat(item.classSchedule.periodStart)} - ${periodToFloat(item.classSchedule.periodEnd)}</td>
          <td>${item.creditCount} TC</td>
          <td>${item.enrolledCount}/${item.classSize}</td>
          <td>${item.year || "N/A"}</td>
          <td>${item.location || "TBA"}</td>
          <td>
            <button type="button" class="action-remove" data-remove-index="${index}">Remove</button>
          </td>
        </tr>`
    )
    .join("");

  listEl.innerHTML = `
    <table class="selected-table" aria-label="My schedule table">
      <thead>
        <tr>
          <th>Course</th>
          <th>Class</th>
          <th>Name</th>
          <th>Day</th>
          <th>Period</th>
          <th>Credits</th>
          <th>Enrolled</th>
          <th>Year</th>
          <th>Location</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

export function renderAvailableCourses(listEl, availableCourses, schedule, searchText) {
  const filtered = filterAvailableCourses(availableCourses, searchText);

  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="available-empty">No available courses match your search.</p>';
    return;
  }

  const selectedIdentities = new Set(schedule.classes.map(classIdentity));
  const rowsHtml = filtered
    .map((item) => {
      const identity = classIdentity(item);
      const disabled = selectedIdentities.has(identity);
      const disabledAttr = disabled ? "disabled" : "";
      const buttonText = disabled ? "Added" : "Add";
      const periodStart = periodToFloat(item.classSchedule.periodStart);
      const periodEnd = periodToFloat(item.classSchedule.periodEnd);
      const exerciseGroup = String(item["Nhóm BT"] || "").trim() || "-";
      const practiceGroup = String(item["Nhóm TH"] || "").trim() || "-";
      const aliasHtml = item.courseAlias
        ? `<div class="available-meta">Alias: ${item.courseAlias}</div>`
        : "";

      return `
        <tr class="available-row">
          <td><strong>${item.courseId}</strong></td>
          <td>${item.classId}</td>
          <td>
            <div><strong>${item.courseName}</strong></div>
            ${aliasHtml}
          </td>
          <td>${exerciseGroup}</td>
          <td>${practiceGroup}</td>
          <td>T${item.classSchedule.dayOfWeek}</td>
          <td>${periodStart} - ${periodEnd}</td>
          <td>${item.creditCount} TC</td>
          <td>${item.enrolledCount}/${item.classSize}</td>
          <td>${item.year || "N/A"}</td>
          <td>${item.location || "TBA"}</td>
          <td>
            <button type="button" class="action-add" data-add-key="${classKey(item)}" ${disabledAttr}>${buttonText}</button>
          </td>
        </tr>
      `;
    })
    .join("");

  listEl.innerHTML = `
    <table class="available-table" aria-label="Available courses table">
      <thead>
        <tr>
          <th>Course</th>
          <th>Class</th>
          <th>Name</th>
          <th>NHÓM BT</th>
          <th>NHÓM TH</th>
          <th>Day</th>
          <th>Period</th>
          <th>Credits</th>
          <th>Enrolled</th>
          <th>Year</th>
          <th>Location</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}