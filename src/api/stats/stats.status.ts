const STATUS = {
  C1: 'C1',
  B2: 'B2',
  B1: 'B1',
  A2: 'A2',
  A1: 'A1',
  asArray: function(): string[] {
    return [
      this.C1, this.B2, this.B1, this.A2, this.A1
    ]
  }
}

export = STATUS
