import NotificationType  from 'api/notification-types/notificationTypes.model'

class NotificationContext {
  /**
   * @param {{}} context
   * @param {{}} transaction
   */
  getContextIdentifier({ name }, transaction) {
    return NotificationType.query(transaction).findOne({
      name
    })
  }
}

export { NotificationContext }
