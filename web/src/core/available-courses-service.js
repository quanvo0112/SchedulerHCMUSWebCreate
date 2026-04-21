import { CourseClass } from "../models/scheduler-models.js";
import { parseClassSchedule } from "./course-service.js";

const DEFAULT_COURSES_URL = "/resources/extracted_table.json";

/**
 * Returns the first non-empty value from a list of candidate keys.
 *
 * @param {Record<string, unknown>} source Raw source object.
 * @param {string[]} keys Candidate keys ordered by priority.
 * @param {unknown} fallback Fallback value when no key contains meaningful data.
 * @returns {unknown} The first non-empty value or the fallback.
 */
function firstDefined(source, keys, fallback = "") {
  for (let i = 0; i < keys.length; i += 1) {
    const value = source?.[keys[i]];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return fallback;
}

/**
 * Converts a value to a trimmed string with a consistent fallback.
 *
 * @param {unknown} value Raw value to normalize.
 * @param {string} fallback Fallback text when value is empty.
 * @returns {string} Normalized string.
 */
function toTrimmedString(value, fallback = "") {
  const text = value === undefined || value === null ? "" : String(value).trim();
  return text || fallback;
}

/**
 * Converts a value to number with NaN-safe fallback.
 *
 * @param {unknown} value Raw value to normalize.
 * @param {number} fallback Fallback number when conversion fails.
 * @returns {number} Normalized numeric value.
 */
function toSafeNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? fallback : numericValue;
}

/**
 * Parses the schedule token from a raw schedule field.
 *
 * @param {unknown} rawSchedule Raw schedule text from source data.
 * @returns {import("../models/scheduler-models.js").ClassSchedule} Parsed class schedule.
 */
function parseScheduleField(rawSchedule) {
  const raw = toTrimmedString(rawSchedule);
  const tokenMatch = raw.match(/T\s*\d+\s*\([^)]*\)/i);
  if (!tokenMatch) {
    throw new Error(`Unsupported schedule field: ${rawSchedule}`);
  }
  return parseClassSchedule(tokenMatch[0]);
}

/**
 * Normalizes a raw course row into a CourseClass model plus source-only group fields.
 *
 * @param {Record<string, unknown>} rawItem Raw row from extracted_table.json.
 * @returns {CourseClass & {"Nhóm BT": string, "Nhóm TH": string}} Normalized course object.
 */
function normalizeRawCourse(rawItem) {
  const courseId = toTrimmedString(
    firstDefined(rawItem, ["courseId", "Mã MH", "maMonHoc", "maMH"])
  );
  const courseName = toTrimmedString(
    firstDefined(rawItem, ["courseName", "Tên Môn Học", "tenMonHoc"])
  );
  const classId = toTrimmedString(firstDefined(rawItem, ["classId", "Tên Lớp", "tenLop"]));
  const creditCount = toSafeNumber(firstDefined(rawItem, ["creditCount", "Số TC", "soTinChi"], 0));
  const classSize = toSafeNumber(firstDefined(rawItem, ["classSize", "Sĩ Số", "siSo"], 0));
  const enrolledCount = toSafeNumber(
    firstDefined(rawItem, ["enrolledCount", "Đã ĐK", "daDangKy"], 0)
  );
  const year = toSafeNumber(firstDefined(rawItem, ["year", "Khóa", "khoa"], 0));
  const location = toTrimmedString(firstDefined(rawItem, ["location", "Địa Điểm", "diaDiem"]));
  const scheduleText = toTrimmedString(
    firstDefined(rawItem, ["classSchedule", "Lịch Học", "lichHoc"])
  );
  const nhomBT = toTrimmedString(firstDefined(rawItem, ["Nhóm BT", "nhomBT"]), "-");
  const nhomTH = toTrimmedString(firstDefined(rawItem, ["Nhóm TH", "nhomTH"]), "-");

  if (!courseId || !courseName || !classId || !scheduleText) {
    throw new Error("Missing required course fields");
  }

  const baseCourse = new CourseClass({
    courseId,
    courseName,
    classId,
    creditCount,
    classSize,
    enrolledCount,
    year,
    location,
    classSchedule: parseScheduleField(scheduleText),
  });

  return Object.assign(baseCourse, {
    "Nhóm BT": nhomBT,
    "Nhóm TH": nhomTH,
  });
}

/**
 * Fetches and normalizes available courses from the configured JSON source.
 * Malformed rows are skipped intentionally.
 *
 * @param {string} [url=DEFAULT_COURSES_URL] Source URL for available courses JSON.
 * @returns {Promise<Array<CourseClass & {"Nhóm BT": string, "Nhóm TH": string}>>} Normalized course list.
 */
export async function fetchAvailableCourses(url = DEFAULT_COURSES_URL) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to fetch courses (${response.status})`);
  }

  const rawList = await response.json();
  if (!Array.isArray(rawList)) {
    throw new Error("courses.json must be a JSON array");
  }

  const normalized = [];
  for (let i = 0; i < rawList.length; i += 1) {
    try {
      normalized.push(normalizeRawCourse(rawList[i]));
    } catch (error) {
      // Skip malformed course rows from source data.
    }
  }

  return normalized;
}

/**
 * Removes Vietnamese diacritics and normalizes casing for accent-insensitive matching.
 *
 * @param {unknown} str Source text.
 * @returns {string} Lowercase text without Vietnamese tones.
 */
export function removeVietnameseTones(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim()
    .toLowerCase();
}

/**
 * Checks whether input text contains Vietnamese accented characters.
 *
 * @param {unknown} str Source text.
 * @returns {boolean} True when accented Vietnamese characters are found.
 */
export function hasVietnameseAccents(str) {
  return /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(
    String(str || "")
  );
}

/**
 * Standardizes Vietnamese composed character forms and common typing variants.
 *
 * @param {unknown} str Source text.
 * @returns {string} Tone-standardized string.
 */
export function standardizeVietnameseTones(str) {
  return String(str || "")
    .normalize("NFC")
    .replace(/oà/g, "òa")
    .replace(/oá/g, "óa")
    .replace(/oả/g, "ỏa")
    .replace(/oã/g, "õa")
    .replace(/oạ/g, "ọa")
    .replace(/uỳ/g, "ùy")
    .replace(/uý/g, "úy")
    .replace(/uỷ/g, "ủy")
    .replace(/uỹ/g, "ũy")
    .replace(/uỵ/g, "ụy")
    .replace(/Oà/g, "Òa")
    .replace(/Oá/g, "Óa")
    .replace(/Oả/g, "Ỏa")
    .replace(/Oã/g, "Õa")
    .replace(/Oạ/g, "Ọa")
    .replace(/Uỳ/g, "Ùy")
    .replace(/Uý/g, "Úy")
    .replace(/Uỷ/g, "Ủy")
    .replace(/Uỹ/g, "Ũy")
    .replace(/Uỵ/g, "Ụy");
}

/**
 * Filters available courses by matching search text against core course attributes.
 * Accent-aware matching is applied only when the query has accents.
 *
 * @param {Array<Record<string, unknown>>} courses Course list to filter.
 * @param {unknown} searchText Search text entered by the user.
 * @returns {Array<Record<string, unknown>>} Filtered list.
 */
export function filterAvailableCourses(courses, searchText) {
  const searchQuery = toTrimmedString(searchText);
  if (!searchQuery) {
    return courses || [];
  }

  const hasAccents = hasVietnameseAccents(searchQuery);
  const queryForMatch = hasAccents
    ? standardizeVietnameseTones(searchQuery).toLowerCase()
    : removeVietnameseTones(searchQuery);

  return (courses || []).filter((item) => {
    const dataString = `${item.courseId} ${item.courseName} ${item.classId} ${item.location}`;
    const dataForMatch = hasAccents
      ? standardizeVietnameseTones(dataString).toLowerCase()
      : removeVietnameseTones(dataString);
    return dataForMatch.includes(queryForMatch);
  });
}
