# Login Notification System

## Overview
This system automatically sends email notifications to sellers whenever they log into their Canadian Bazaar seller account. The notification includes security details and provides options for users to secure their account if the login was unauthorized.

## Features

### Email Notifications
- **Automatic sending**: Every successful login triggers an email notification
- **Security details**: Includes login time, date, IP address, device type, and browser information
- **Security warnings**: Alerts users about unrecognized devices (when implemented)
- **Action buttons**: Direct link to change password page

### Security Information Included
- Login time and date (in Canadian timezone)
- IP address of the login attempt
- Device type (Mobile, Tablet, Desktop)
- Browser information
- Location (currently defaults to Canada, can be enhanced with IP geolocation)

### Email Template
- Professional design with Canadian Bazaar branding
- Security-focused messaging
- Clear call-to-action buttons
- Responsive design for mobile and desktop
- Security tips and recommendations

## Implementation Details

### Backend Changes
1. **Modified `loginController`** in `seller-db/api/controllers/auth.controller.js`:
   - Added email notification logic after successful authentication
   - Extracts client information (IP, user agent, device type)
   - Sends email using existing `sendMail` helper
   - Error handling to prevent login failures if email sending fails

2. **Email Template** at `seller-db/api/templates/login-notification.ejs`:
   - Professional HTML email template
   - Includes all login details
   - Security warnings and tips
   - Direct link to profile page for password changes

### Frontend Integration
- Uses existing password change functionality in profile page
- No frontend changes required
- Email links direct users to `/profile` page where they can change password

## Configuration

### Environment Variables
- `FRONTEND_URL`: Base URL for the seller frontend (defaults to `https://seller.canadian-bazaar.com`)
- Email configuration is handled by existing `sendMail` helper

### Email Settings
- Uses existing AWS SES configuration
- Transactional email prefix: `no-reply`
- Subject: "Security Alert: New Login to Your Account"

## Security Features

### Current Implementation
- Basic device fingerprinting using user agent and IP
- Login attempt logging
- Email notifications for all logins

### Future Enhancements
- Device recognition and tracking
- IP geolocation for accurate location detection
- Suspicious login detection
- Rate limiting for email notifications
- User preferences for notification frequency

## Usage

### For Sellers
1. Login to your seller account
2. Check your email for the login notification
3. If the login was unauthorized:
   - Click "Change Password" button in the email
   - Or go to your Profile page and change password
   - Contact support if needed

### For Developers
- Email notifications are sent automatically on every successful login
- No additional configuration required
- Email sending errors are logged but don't affect login process
- Template can be customized in `login-notification.ejs`

## Testing

### Manual Testing
1. Login to a seller account
2. Check the seller's email for the notification
3. Verify all information is correct (time, IP, device, etc.)
4. Test the "Change Password" link

### Email Template Testing
- Test with different user agents (mobile, desktop, tablet)
- Verify responsive design on different email clients
- Check all links and buttons work correctly

## Troubleshooting

### Common Issues
1. **Emails not being sent**: Check AWS SES configuration and credentials
2. **Incorrect information**: Verify IP extraction and user agent parsing
3. **Template rendering issues**: Check EJS template syntax and data passing

### Logs
- Email sending errors are logged to console
- Check server logs for any email-related issues
- Monitor AWS SES for delivery status

## Future Improvements

1. **Enhanced Security**:
   - Implement device fingerprinting and recognition
   - Add IP geolocation service integration
   - Suspicious login pattern detection

2. **User Experience**:
   - Allow users to disable notifications
   - Different notification frequencies
   - Mobile app push notifications

3. **Analytics**:
   - Track notification open rates
   - Monitor security actions taken
   - Login pattern analysis

## Support

For any issues or questions regarding the login notification system:
- Check server logs for error messages
- Verify email configuration and AWS SES setup
- Test with different user agents and devices
- Contact development team for advanced configuration
