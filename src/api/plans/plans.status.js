const STATUS = {
  COURSES: 'COURSES',
  CLASSES: 'CLASSES',
  EXAMS: 'EXAMS',
  asArray() {
    return [this.COURSES, this.CLASSES, this.EXAMS]
  }
}

module.exports = STATUS
