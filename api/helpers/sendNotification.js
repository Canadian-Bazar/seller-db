import BuyerNotifications from '../models/buyer-notifications.schema.js';

const sendNotification = async (data) => {
  try {
    const notification = new BuyerNotifications(data)
    console.log(notification)
    await notification.save()
    console.log('Notification sent successfully')
  } catch (err) {
    console.error('Error sending notification:', err)
    throw err 
  }
}

export default sendNotification