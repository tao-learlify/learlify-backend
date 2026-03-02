const STATUS = {
  PENDING: 'PENDING',
  TAKEN: 'TAKEN',
  EVALUATED: 'EVALUATED',
  asArray: function() {
    return [this.PENDING, this.TAKEN, this.EVALUATED]
  }
}

module.exports = STATUS