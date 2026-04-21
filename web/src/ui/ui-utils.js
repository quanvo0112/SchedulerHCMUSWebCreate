const classColorMap = new Map();

export function showStatus(statusEl, message, tone = "ok") {
  statusEl.textContent = message;
  statusEl.classList.remove("ok", "warn");
  statusEl.classList.add(tone);
}

export function getExportFilename(extension) {
  const currentDate = new Date().toISOString().split("T")[0];
  return `unitime-hcmus-schedule-${currentDate}.${extension}`;
}

export function getRandomColorForClass(key) {
  const mapKey = String(key || "");
  const existing = classColorMap.get(mapKey);
  if (existing) {
    return existing;
  }

  const hue = Math.floor(Math.random() * 360);
  const saturation = 62 + Math.floor(Math.random() * 14);
  const lightness = 54 + Math.floor(Math.random() * 10);
  const color = `hsl(${hue} ${saturation}% ${lightness}%)`;
  classColorMap.set(mapKey, color);
  return color;
}

export function classIdentity(item) {
  return `${item.courseId}::${item.classId}::${item.classSchedule.dayOfWeek}`;
}

export function classKey(item) {
  return `${item.courseId}::${item.classId}::${item.classSchedule.dayOfWeek}::${item.classSchedule.periodStart}::${item.classSchedule.periodEnd}`;
}
