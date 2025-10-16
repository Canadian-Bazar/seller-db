# Admin Notification System for New Seller Registrations

## Overview
This system automatically sends email notifications to administrators whenever a new seller registers on the Canadian Bazaar platform. The notification includes comprehensive seller information and provides direct action buttons for approval/rejection.

## Features

### Automatic Admin Notifications
- **Immediate notification**: Sent as soon as a seller completes registration
- **Comprehensive details**: Includes all seller information, registration details, and technical data
- **Action buttons**: Direct links to approve, reject, or review in admin panel
- **Professional design**: Branded email template with clear information hierarchy

### Information Included
- **Seller Details**: Company name, email, phone, business number
- **Registration Info**: Date, time, IP address, user agent
- **Technical Data**: Seller ID, registration source, device information
- **Status Information**: Current approval status and verification state

### Email Template Features
- Professional admin-focused design
- Clear action buttons for quick decisions
- Comprehensive seller information display
- Security-focused information (IP, user agent)
- Direct links to admin panel actions

## Implementation Details

### Backend Changes
1. **Modified `signupController`** in `seller-db/api/controllers/auth.controller.js`:
   - Added admin notification after seller creation in legacy signup flow
   - Extracts registration information (IP, user agent, timestamps)
   - Sends email using existing `sendMail` helper
   - Error handling to prevent signup failures if email sending fails

2. **Modified `verifyPhoneNumberOtp`** in `seller-db/api/controllers/auth.controller.js`:
   - Added admin notification after seller creation in new signup flow
   - Same comprehensive information extraction
   - Consistent error handling

3. **Email Template** at `seller-db/api/templates/admin-seller-signup-notification.ejs`:
   - Professional HTML email template for admin notifications
   - Includes all seller and registration details
   - Direct action buttons for approval/rejection
   - Security information and technical details

### Configuration

#### Environment Variables
- `ADMIN_EMAIL`: Email address to receive admin notifications (defaults to `admin@canadian-bazaar.com`)
- `ADMIN_FRONTEND_URL`: Base URL for the admin frontend (defaults to `https://admin.canadian-bazaar.com`)
- `FRONTEND_URL`: Base URL for the seller frontend (used in email links)

#### Email Settings
- Uses existing AWS SES configuration
- Transactional email prefix: `no-reply`
- Subject: "New Seller Registration: [Company Name] - Action Required"

## Email Template Features

### Information Display
- **Seller Information**: Company name, email, phone, business number
- **Registration Details**: Date, time, IP address, user agent
- **Technical Information**: Seller ID, registration source
- **Status Information**: Current approval and verification status

### Action Buttons
- **Review in Admin Panel**: Direct link to seller management
- **Approve Registration**: Quick approval action
- **Reject Registration**: Quick rejection action

### Design Features
- Professional admin-focused design
- Clear information hierarchy
- Responsive layout for mobile and desktop
- Security-focused color scheme
- Priority indicators for urgent actions

## Security Features

### Information Security
- IP address tracking for registration source
- User agent information for device identification
- Registration timestamp for audit trail
- Seller ID for database reference

### Admin Actions
- Direct links to admin panel for detailed review
- Quick approval/rejection buttons
- Comprehensive seller information for decision making
- Security information for fraud detection

## Usage

### For Administrators
1. **Receive Notification**: Get email when new seller registers
2. **Review Information**: Check seller details and registration info
3. **Take Action**: Use buttons to approve, reject, or review in detail
4. **Follow Up**: Contact seller if additional information needed

### For Developers
- Notifications sent automatically on every successful registration
- No additional configuration required beyond environment variables
- Email sending errors logged but don't affect registration process
- Template can be customized in `admin-seller-signup-notification.ejs`

## Configuration Examples

### Environment Variables
```bash
# Admin notification email
ADMIN_EMAIL=admin@canadian-bazaar.com

# Admin frontend URL
ADMIN_FRONTEND_URL=https://admin.canadian-bazaar.com

# Seller frontend URL
FRONTEND_URL=https://seller.canadian-bazaar.com
```

### Email Template Customization
- Modify `admin-seller-signup-notification.ejs` for design changes
- Update action URLs in the template
- Customize information display as needed

## Testing

### Manual Testing
1. Register a new seller account
2. Check admin email for notification
3. Verify all information is correct
4. Test action buttons (approve/reject links)
5. Check admin panel integration

### Email Template Testing
- Test with different seller information
- Verify responsive design on different email clients
- Check all links and buttons work correctly
- Validate information display accuracy

## Troubleshooting

### Common Issues
1. **Emails not being sent**: Check AWS SES configuration and credentials
2. **Incorrect information**: Verify data extraction in signup controllers
3. **Template rendering issues**: Check EJS template syntax and data passing
4. **Action buttons not working**: Verify admin frontend URLs and routes

### Logs
- Email sending errors are logged to console
- Check server logs for any email-related issues
- Monitor AWS SES for delivery status
- Verify admin email configuration

## Future Enhancements

### Advanced Features
1. **Multiple Admin Recipients**: Send to multiple admin emails
2. **Admin Preferences**: Allow admins to configure notification settings
3. **Priority Levels**: Different notification types based on seller information
4. **Auto-approval Rules**: Automatic approval for certain criteria

### Integration Improvements
1. **Slack Notifications**: Send notifications to Slack channels
2. **SMS Notifications**: Send SMS alerts for urgent registrations
3. **Dashboard Integration**: Real-time notifications in admin dashboard
4. **Analytics**: Track notification effectiveness and response times

### Security Enhancements
1. **Fraud Detection**: Flag suspicious registrations
2. **IP Geolocation**: Enhanced location information
3. **Device Fingerprinting**: More detailed device information
4. **Risk Scoring**: Automatic risk assessment for new registrations

## Support

For any issues or questions regarding the admin notification system:
- Check server logs for error messages
- Verify email configuration and AWS SES setup
- Test with different seller registration scenarios
- Contact development team for advanced configuration

## Related Systems

### Login Notifications
- Seller login notifications (separate system)
- Admin login notifications (if implemented)
- Security alert system

### Admin Panel Integration
- Seller management interface
- Approval/rejection workflows
- User management system

### Email Infrastructure
- AWS SES configuration
- Email template system
- Notification preferences
