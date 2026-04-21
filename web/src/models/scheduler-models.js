export const COURSE_COLUMNS = Object.freeze({
  COURSE_ID: 0,
  COURSE_NAME: 1,
  CLASS_ID: 2,
  CREDIT_COUNT: 3,
  CLASS_SIZE: 4,
  ENROLLED_COUNT: 5,
  YEAR: 6,
  CLASS_SCHEDULE: 7,
  LOCATION: 10,
});

export const MAX_CLASSES_PER_DAY = 4;

export const FILTER_PROPERTY = Object.freeze({
  ALL: 0,
  COURSE_ID: 1,
  COURSE_NAME: 2,
  CLASS_ID: 3,
});

export const Period = Object.freeze({
  PERIOD_1: "PERIOD_1",
  PERIOD_2: "PERIOD_2",
  PERIOD_2_5: "PERIOD_2_5",
  PERIOD_3: "PERIOD_3",
  PERIOD_3_5: "PERIOD_3_5",
  PERIOD_4: "PERIOD_4",
  PERIOD_5: "PERIOD_5",
  PERIOD_6: "PERIOD_6",
  PERIOD_7: "PERIOD_7",
  PERIOD_7_5: "PERIOD_7_5",
  PERIOD_8: "PERIOD_8",
  PERIOD_8_5: "PERIOD_8_5",
  PERIOD_9: "PERIOD_9",
  PERIOD_10: "PERIOD_10",
});

export const PERIOD_TO_FLOAT = Object.freeze({
  [Period.PERIOD_1]: 1,
  [Period.PERIOD_2]: 2,
  [Period.PERIOD_2_5]: 2.5,
  [Period.PERIOD_3]: 3,
  [Period.PERIOD_3_5]: 3.5,
  [Period.PERIOD_4]: 4,
  [Period.PERIOD_5]: 5,
  [Period.PERIOD_6]: 6,
  [Period.PERIOD_7]: 7,
  [Period.PERIOD_7_5]: 7.5,
  [Period.PERIOD_8]: 8,
  [Period.PERIOD_8_5]: 8.5,
  [Period.PERIOD_9]: 9,
  [Period.PERIOD_10]: 10,
});

export const FLOAT_TO_PERIOD = Object.freeze(
  Object.entries(PERIOD_TO_FLOAT).reduce((acc, [period, value]) => {
    acc[String(value)] = period;
    return acc;
  }, {})
);

export class ClassSchedule {
  constructor({ dayOfWeek = 0, periodStart = Period.PERIOD_1, periodEnd = Period.PERIOD_1 } = {}) {
    this.dayOfWeek = Number(dayOfWeek);
    this.periodStart = periodStart;
    this.periodEnd = periodEnd;
  }

  toJSON() {
    return {
      dayOfWeek: this.dayOfWeek,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
    };
  }

  static fromJSON(data = {}) {
    return new ClassSchedule(data);
  }
}

// "Class" is a reserved keyword in JS syntax, so we use CourseClass.
export class CourseClass {
  constructor({
    courseId = "",
    courseName = "",
    courseAlias = "",
    classId = "",
    classSize = 0,
    enrolledCount = 0,
    creditCount = 0,
    classSchedule = {},
    year = 0,
    location = "",
  } = {}) {
    this.courseId = String(courseId);
    this.courseName = String(courseName);
    this.courseAlias = String(courseAlias);
    this.classId = String(classId);
    this.classSize = Number(classSize);
    this.enrolledCount = Number(enrolledCount);
    this.creditCount = Number(creditCount);
    this.classSchedule =
      classSchedule instanceof ClassSchedule
        ? classSchedule
        : new ClassSchedule(classSchedule);
    this.year = Number(year);
    this.location = String(location);
  }

  toJSON() {
    return {
      courseId: this.courseId,
      courseName: this.courseName,
      courseAlias: this.courseAlias,
      classId: this.classId,
      classSize: this.classSize,
      enrolledCount: this.enrolledCount,
      creditCount: this.creditCount,
      classSchedule: this.classSchedule.toJSON(),
      year: this.year,
      location: this.location,
    };
  }

  static fromJSON(data = {}) {
    return new CourseClass(data);
  }
}

// Equivalent of StudentSchedule in schedule.h
export class StudentSchedule {
  constructor(classes = []) {
    this.classes = classes.map((item) =>
      item instanceof CourseClass ? item : CourseClass.fromJSON(item)
    );
  }

  toJSON() {
    return {
      classes: this.classes.map((item) => item.toJSON()),
    };
  }

  static fromJSON(data = {}) {
    return new StudentSchedule(data.classes || []);
  }
}

// def.h values relevant for web defaults.
export const UI_DEFAULTS = Object.freeze({
  SCREEN_WIDTH: 1280,
  SCREEN_HEIGHT: 720,
  FONT_SIZE_DEFAULT: 20,
  FONT_SIZE_SMALL: 10,
  COLOR_LIGHTBLUE: "rgba(220,250,255,1)",
  COLOR_LIGHTBLUE_ALPHA: "rgba(220,250,255,0.392)",
});
