import { CourseClass } from "../models/scheduler-models.js";
import { parseClassSchedule } from "./course-service.js";

const DEFAULT_COURSES_URL = "/resources/extracted_table.json";

function firstDefined(obj, keys, fallback = "") {
  for (let i = 0; i < keys.length; i += 1) {
    const value = obj[keys[i]];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return fallback;
}

function parseScheduleField(rawSchedule) {
  const raw = String(rawSchedule || "").trim();
  const tokenMatch = raw.match(/T\s*\d+\s*\([^)]*\)/i);
  if (!tokenMatch) {
    throw new Error(`Unsupported schedule field: ${rawSchedule}`);
  }
  return parseClassSchedule(tokenMatch[0]);
}

function normalizeRawCourse(rawItem) {
  const courseId = String(firstDefined(rawItem, ["courseId", "Mã MH", "maMonHoc", "maMH"], "")).trim();
  const courseName = String(firstDefined(rawItem, ["courseName", "Tên Môn Học", "tenMonHoc"], "")).trim();
  const classId = String(firstDefined(rawItem, ["classId", "Tên Lớp", "tenLop"], "")).trim();
  const creditCount = Number(firstDefined(rawItem, ["creditCount", "Số TC", "soTinChi"], 0));
  const classSize = Number(firstDefined(rawItem, ["classSize", "Sĩ Số", "siSo"], 0));
  const enrolledCount = Number(firstDefined(rawItem, ["enrolledCount", "Đã ĐK", "daDangKy"], 0));
  const year = Number(firstDefined(rawItem, ["year", "Khóa", "khoa"], 0));
  const location = String(firstDefined(rawItem, ["location", "Địa Điểm", "diaDiem"], "")).trim();
  const scheduleText = String(firstDefined(rawItem, ["classSchedule", "Lịch Học", "lichHoc"], "")).trim();

  if (!courseId || !courseName || !classId || !scheduleText) {
    throw new Error("Missing required course fields");
  }

  const course = new CourseClass({
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

  const rawNhomBT = rawItem["Nhóm BT"];
  const rawNhomTH = rawItem["Nhóm TH"];

  // Preserve exact source keys and assign model-level fallback for missing values.
  course["Nhóm BT"] =
    rawNhomBT !== undefined && rawNhomBT !== null && String(rawNhomBT).trim() !== ""
      ? String(rawNhomBT).trim()
      : "-";
  course["Nhóm TH"] =
    rawNhomTH !== undefined && rawNhomTH !== null && String(rawNhomTH).trim() !== ""
      ? String(rawNhomTH).trim()
      : "-";

  return course;
}

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

export function removeVietnameseTones(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim()
    .toLowerCase();
}

export function hasVietnameseAccents(str) {
  return /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(
    String(str || "")
  );
}

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

export function filterAvailableCourses(courses, searchText) {
  const searchQuery = String(searchText || "").trim();
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
