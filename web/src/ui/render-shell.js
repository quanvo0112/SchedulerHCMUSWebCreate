const WEEK_DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const PERIODS = [1, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 7.5, 8, 8.5, 9, 10];

export function renderPeriodOptions(startSelect, endSelect) {
  const optionsHtml = PERIODS.map((period) => `<option value="${period}">${period}</option>`).join("");
  startSelect.innerHTML = optionsHtml;
  endSelect.innerHTML = optionsHtml;
  startSelect.value = "1";
  endSelect.value = "2";
}

export function renderTimetableShell(container) {
  const headCells = WEEK_DAYS.map((day) => `<th class="day-col-head">${day.label}</th>`).join("");

  const bodyRows = PERIODS.map((period) => {
    const dayCells = WEEK_DAYS.map(
      (day) => `<td class="slot-cell" data-day="${day.value}" data-period="${period}"></td>`
    ).join("");

    return `
      <tr>
        <th class="period-label" scope="row">P${period}</th>
        ${dayCells}
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <table class="timetable-table" aria-label="Weekly timetable">
      <thead>
        <tr>
          <th class="time-col-head">Period</th>
          ${headCells}
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
  `;
}

export function renderLegend(container) {
  const examples = [
    { name: "Core", color: "#2a9d8f" },
    { name: "Lab", color: "#e76f51" },
    { name: "Elective", color: "#457b9d" },
  ];

  container.innerHTML = examples
    .map(
      (item) =>
        `<span class="legend-item" style="--tag-color:${item.color};">${item.name}</span>`
    )
    .join("");
}

export { PERIODS, WEEK_DAYS };
