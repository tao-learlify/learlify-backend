const STATUS = {
  COURSES: 'COURSES',
  CLASSES: 'CLASSES',
  EXAMS: 'EXAMS',
  asArray(): string[] {
    return [this.COURSES, this.CLASSES, this.EXAMS]
  }
} as const

export = STATUS
