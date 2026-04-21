import {
  ClassSchedule,
  CourseClass,
  FILTER_PROPERTY,
  FLOAT_TO_PERIOD,
  MAX_CLASSES_PER_DAY,
  PERIOD_TO_FLOAT,
} from "../models/scheduler-models.js";

const PERIOD_EPSILON = 0.01;

/**
 * @typedef {import("../models/scheduler-models.js").CourseClass} CourseClassModel
 */

/**
 * @typedef {import("../models/scheduler-models.js").ClassSchedule} ClassScheduleModel
 */

/**
 * @typedef {Object} ParseClassesOptions
 * @property {boolean} [skipHeader=true] Whether to skip the first non-empty line.
 */

/**
 * @typedef {(classes: Array<CourseClassModel|Object> | null | undefined, searchText: string) => Array<CourseClassModel|Object>} FilterStrategy
 */

/**
 * @typedef {Object.<number, FilterStrategy>} FilterStrategyMap
 */

/**
 * Normalizes text for accent-insensitive and case-insensitive search.
 *
 * @param {unknown} value Raw input value.
 * @returns {string} Normalized searchable string.
 */
function normalizeTextForSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Removes wrapping single/double quotes from a token.
 *
 * @param {unknown} value Raw token value.
 * @returns {string} Clean token value.
 */
function unwrapValue(value) {
  const text = String(value || "").trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).trim();
  }
  return text;
}

/**
 * Splits a tabular line using best-effort delimiter detection.
 * Priority: real tab, escaped tab, then common separators.
 *
 * @param {string} line A single row in TSV/CSV-like format.
 * @returns {string[]} Parsed columns.
 */
function splitTabularLine(line) {
  const raw = String(line || "").trim();

  if (raw.includes("\t")) {
    return raw.split("\t").map(unwrapValue);
  }

  if (raw.includes("\\t")) {
    return raw.split("\\t").map(unwrapValue);
  }

  const separators = [";", ",", "|"];
  let bestSeparator = null;
  let bestCount = 0;

  separators.forEach((separator) => {
    const count = raw.split(separator).length;
    if (count > bestCount) {
      bestCount = count;
      bestSeparator = separator;
    }
  });

  if (bestSeparator && bestCount >= 8) {
    return raw.split(bestSeparator).map(unwrapValue);
  }

  return [raw];
}

/**
 * Detects if a row likely contains headers instead of data.
 *
 * @param {string[]} columns Row columns.
 * @returns {boolean} True if row appears to be a header.
 */
function looksLikeHeader(columns) {
  const text = columns.join(" ").toLowerCase();
  return (
    text.includes("course") ||
    text.includes("class") ||
    text.includes("credit") ||
    text.includes("enrolled") ||
    text.includes("schedule")
  );
}

/**
 * Safely converts a value to number for class fields.
 *
 * @param {unknown} value Raw value.
 * @param {string} fieldName Field name for diagnostics.
 * @returns {number} Parsed finite number.
 * @throws {Error} Throws when conversion results in NaN.
 */
function toNumberOrThrow(value, fieldName) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value for ${fieldName}: ${value}`);
  }
  return parsed;
}

/**
 * Converts a float period value to enum period label using epsilon matching.
 *
 * @param {number | string} periodFloat Numeric period representation (for example: 1.0, 1.5).
 * @returns {string} Period enum key defined in scheduler models.
 * @throws {Error} Throws when no supported period can be matched.
 */
export function parsePeriod(periodFloat) {
  const value = Number(periodFloat);
  const knownValues = Object.values(PERIOD_TO_FLOAT);

  for (let i = 0; i < knownValues.length; i += 1) {
    if (Math.abs(value - knownValues[i]) < PERIOD_EPSILON) {
      return FLOAT_TO_PERIOD[String(knownValues[i])];
    }
  }

  throw new Error(`Invalid period float: ${periodFloat}`);
}

/**
 * Converts period enum label to float value.
 *
 * @param {string} period Period enum label.
 * @returns {number} Numeric period value.
 * @throws {Error} Throws when period is unsupported.
 */
export function periodToFloat(period) {
  const mapped = PERIOD_TO_FLOAT[period];
  if (typeof mapped !== "number") {
    throw new Error(`Invalid period enum value: ${period}`);
  }
  return mapped;
}

/**
 * Serializes a course class object into a compact human-readable string.
 *
 * @param {CourseClassModel | Object} courseClass Course class instance or plain JSON object.
 * @returns {string} Readable class summary.
 */
export function classToString(courseClass) {
  const c = courseClass instanceof CourseClass ? courseClass : CourseClass.fromJSON(courseClass);
  const start = periodToFloat(c.classSchedule.periodStart);
  const end = periodToFloat(c.classSchedule.periodEnd);

  return `${c.courseId} | ${c.courseName} | ${c.classId} | ${c.location} | ${c.enrolledCount}/${c.classSize} | TC:${c.creditCount} | T${c.classSchedule.dayOfWeek} ${start.toFixed(1)}-${end.toFixed(1)} | ${c.year}`;
}

/**
 * Parses a schedule token in format `T<day> (<start>-<end>)`.
 *
 * @param {string} scheduleStr Raw schedule text.
 * @returns {ClassScheduleModel} Parsed class schedule object.
 * @throws {Error} Throws when format is invalid.
 */
export function parseClassSchedule(scheduleStr) {
  const raw = String(scheduleStr || "").trim();
  const match = raw.match(/^T\s*(\d+)\s*\(\s*(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*\)$/i);

  if (!match) {
    throw new Error(`Invalid schedule format: ${scheduleStr}`);
  }

  const dayOfWeek = Number(match[1]);
  const periodStart = parsePeriod(Number(match[2].replace(",", ".")));
  const periodEnd = parsePeriod(Number(match[3].replace(",", ".")));

  return new ClassSchedule({ dayOfWeek, periodStart, periodEnd });
}

/**
 * Parses one row into a CourseClass model.
 *
 * @param {string} line Raw tabular row.
 * @returns {CourseClassModel} Parsed class object.
 * @throws {Error} Throws when row shape or values are invalid.
 */
export function parseClassFromTSVLine(line) {
  const columns = splitTabularLine(line);
  if (columns.length < 8) {
    throw new Error("Invalid class row: expected at least 8 tabular columns");
  }

  const locationIndex = columns.length >= 11 ? 10 : 8;
  const scheduleIndex = 7;

  return new CourseClass({
    courseId: columns[0] || "",
    courseName: columns[1] || "",
    classId: columns[2] || "",
    creditCount: toNumberOrThrow(columns[3] || 0, "creditCount"),
    classSize: toNumberOrThrow(columns[4] || 0, "classSize"),
    enrolledCount: toNumberOrThrow(columns[5] || 0, "enrolledCount"),
    year: toNumberOrThrow(columns[6] || 0, "year"),
    classSchedule: parseClassSchedule(columns[scheduleIndex] || ""),
    location: columns[locationIndex] || "",
  });
}

/**
 * Parses multiple tabular rows into class models.
 * Malformed lines are skipped with a warning so import can continue.
 *
 * @param {string} tsvText Raw text containing rows.
 * @param {ParseClassesOptions} [options] Parsing options.
 * @returns {CourseClassModel[]} Parsed class collection.
 */
export function parseClassesFromTSVText(tsvText, { skipHeader = true } = {}) {
  const lines = String(tsvText || "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  const dataLines = [...lines];
  if (skipHeader && dataLines.length > 0) {
    dataLines.shift();
  } else if (!skipHeader && dataLines.length > 0) {
    const firstColumns = splitTabularLine(dataLines[0]);
    if (looksLikeHeader(firstColumns)) {
      dataLines.shift();
    }
  }

  const classes = [];

  for (let i = 0; i < dataLines.length; i += 1) {
    try {
      classes.push(parseClassFromTSVLine(dataLines[i]));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`[course-service] Skipping malformed row at index ${i}: ${errorMessage}`);
    }
  }

  return classes;
}

/**
 * Filters classes by course id (accent-insensitive, case-insensitive contains).
 *
 * @param {Array<CourseClassModel|Object> | null | undefined} classes Input classes.
 * @param {string} courseId Search text.
 * @returns {Array<CourseClassModel|Object>} Filtered classes.
 */
export function filterByCourseId(classes, courseId) {
  const searchText = normalizeTextForSearch(courseId);
  return (classes || []).filter((item) => normalizeTextForSearch(item.courseId).includes(searchText));
}

/**
 * Filters classes by course name (accent-insensitive, case-insensitive contains).
 *
 * @param {Array<CourseClassModel|Object> | null | undefined} classes Input classes.
 * @param {string} courseName Search text.
 * @returns {Array<CourseClassModel|Object>} Filtered classes.
 */
export function filterByCourseName(classes, courseName) {
  const searchText = normalizeTextForSearch(courseName);
  return (classes || []).filter((item) => normalizeTextForSearch(item.courseName).includes(searchText));
}

/**
 * Filters classes by class id (accent-insensitive, case-insensitive contains).
 *
 * @param {Array<CourseClassModel|Object> | null | undefined} classes Input classes.
 * @param {string} classId Search text.
 * @returns {Array<CourseClassModel|Object>} Filtered classes.
 */
export function filterByClassId(classes, classId) {
  const searchText = normalizeTextForSearch(classId);
  return (classes || []).filter((item) => normalizeTextForSearch(item.classId).includes(searchText));
}

/**
 * Filters classes using broad text search across id, name and class id.
 *
 * @param {Array<CourseClassModel|Object> | null | undefined} classes Input classes.
 * @param {string} searchText Search text.
 * @returns {Array<CourseClassModel|Object>} Filtered classes.
 */
export function filterByAll(classes, searchText) {
  const search = normalizeTextForSearch(searchText);
  return (classes || []).filter((item) => {
    return (
      normalizeTextForSearch(item.courseId).includes(search) ||
      normalizeTextForSearch(item.courseName).includes(search) ||
      normalizeTextForSearch(item.classId).includes(search)
    );
  });
}

/**
 * Filters classes by day and containing period.
 *
 * @param {Array<CourseClassModel|Object> | null | undefined} classes Input classes.
 * @param {number | string} dayOfWeek Day of week number.
 * @param {string} period Period enum label.
 * @returns {Array<CourseClassModel|Object>} Filtered classes.
 */
export function filterByPeriod(classes, dayOfWeek, period) {
  const periodValue = periodToFloat(period);

  return (classes || []).filter((item) => {
    const sameDay = Number(item.classSchedule.dayOfWeek) === Number(dayOfWeek);
    const start = periodToFloat(item.classSchedule.periodStart);
    const end = periodToFloat(item.classSchedule.periodEnd);
    return sameDay && start <= periodValue && periodValue <= end;
  });
}

/**
 * Selects filtering strategy based on property index.
 *
 * @param {Array<CourseClassModel|Object> | null | undefined} classes Input classes.
 * @param {number} propertyIndex Filter selector index.
 * @param {string} searchText Search text.
 * @returns {Array<CourseClassModel|Object>} Filtered classes.
 */
export function filterClasses(classes, propertyIndex, searchText) {
  /** @type {FilterStrategyMap} */
  const strategyMap = {
    [FILTER_PROPERTY.COURSE_ID]: filterByCourseId,
    [FILTER_PROPERTY.COURSE_NAME]: filterByCourseName,
    [FILTER_PROPERTY.CLASS_ID]: filterByClassId,
    [FILTER_PROPERTY.ALL]: filterByAll,
  };

  const strategy = strategyMap[propertyIndex] || filterByAll;
  return strategy(classes, searchText);
}

/**
 * Counts classes occurring on a given day.
 *
 * @param {Array<CourseClassModel|Object> | null | undefined} classes Input classes.
 * @param {number | string} dayOfWeek Day of week number.
 * @returns {number} Number of classes on day.
 */
export function countClassesByDay(classes, dayOfWeek) {
  return (classes || []).filter((item) => Number(item.classSchedule.dayOfWeek) === Number(dayOfWeek)).length;
}

/**
 * Checks if classes in a day are still below max threshold.
 *
 * @param {Array<CourseClassModel|Object> | null | undefined} classes Input classes.
 * @param {number | string} dayOfWeek Day of week number.
 * @returns {boolean} True when one more class can be added.
 */
export function canAddMoreInDay(classes, dayOfWeek) {
  return countClassesByDay(classes, dayOfWeek) < MAX_CLASSES_PER_DAY;
}
