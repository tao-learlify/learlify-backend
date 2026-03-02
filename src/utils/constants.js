export const roles = {
  USER: 'User',
  TEACHER: 'Teacher',
  ADMIN: 'Admin',
  asArray: function() {
    return [this.USER, this.TEACHER, this.ADMIN]
  }
}
