const context = {
  DEMO: 'aptisgo@noreply',
  /**
   * @param {string} email 
   */
  isDemoUser (email) {
    return this.DEMO.toLowerCase() === email.toLowerCase()
  }
}

export default context