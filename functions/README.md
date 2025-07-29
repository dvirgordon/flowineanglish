# Payment Reminder Cloud Functions

This directory contains Firebase Cloud Functions for sending automated payment reminders to students with unpaid balances.

## Features

- **Scheduled Reminders**: Runs every 2 days to check for unpaid balances
- **Smart Filtering**: Only sends reminders for payments older than 2 days
- **Professional Emails**: Beautiful HTML emails with payment details
- **Automatic Stop**: Stops sending reminders when payments are marked as fully paid
- **Manual Trigger**: HTTP endpoint for testing and manual execution

## Setup Instructions

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure SendGrid

1. Create a SendGrid account at [sendgrid.com](https://sendgrid.com)
2. Create an API key with "Mail Send" permissions
3. Set up Firebase Functions configuration:

```bash
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"
firebase functions:config:set sendgrid.from_email="noreply@yourdomain.com"
```

### 3. Configure App Settings

```bash
firebase functions:config:set app.dashboard_url="https://your-app-url.com/student.html"
firebase functions:config:set app.secret_key="YOUR_SECRET_KEY_FOR_MANUAL_TRIGGER"
```

### 4. Deploy Functions

```bash
firebase deploy --only functions
```

## Functions Overview

### 1. `sendPaymentReminders` (Scheduled)
- **Schedule**: Every 2 days at 00:00 (Israel timezone)
- **Purpose**: Scans payments collection for unpaid balances
- **Logic**: 
  - Finds payments with `isFullyPaid: false`
  - Checks if payment was updated more than 2 days ago
  - Calculates current balance
  - Sends reminder email if balance > 0
  - Updates payment record with reminder tracking

### 2. `manualPaymentReminder` (HTTP)
- **Endpoint**: `https://your-region-your-project.cloudfunctions.net/manualPaymentReminder`
- **Method**: POST
- **Auth**: Bearer token in Authorization header
- **Purpose**: Manual trigger for testing or immediate execution

### 3. `stopPaymentReminders` (Firestore Trigger)
- **Trigger**: When payment document is updated
- **Purpose**: Automatically stops reminders when payment is marked as fully paid
- **Logic**: Sets `remindersStopped: true` when `isFullyPaid` changes to true

## Email Template

The reminder emails include:
- Professional Flow English branding
- Student's name and payment details
- Month and balance information
- Direct link to student dashboard
- Clear call-to-action

## Payment Record Structure

The functions expect payment documents with this structure:

```javascript
{
  studentId: "user_id",
  month: "2024-01",
  amountPaid: 150.00,
  isFullyPaid: false,
  updatedAt: timestamp,
  updatedBy: "admin",
  lastReminderSent: timestamp, // Added by function
  reminderCount: 3, // Added by function
  remindersStopped: false, // Added by function
  remindersStoppedAt: timestamp // Added by function
}
```

## Testing

### 1. Manual Trigger Test

```bash
curl -X POST \
  https://your-region-your-project.cloudfunctions.net/manualPaymentReminder \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json"
```

### 2. Local Testing

```bash
firebase emulators:start --only functions
```

### 3. View Logs

```bash
firebase functions:log
```

## Configuration Options

### SendGrid Configuration
- `sendgrid.key`: Your SendGrid API key
- `sendgrid.from_email`: Sender email address

### App Configuration
- `app.dashboard_url`: URL to student dashboard
- `app.secret_key`: Secret key for manual trigger authentication

### Timezone
- Functions run in Israel timezone (`Asia/Jerusalem`)
- All date calculations use this timezone

## Error Handling

The functions include comprehensive error handling:
- Individual payment processing errors don't stop the entire batch
- Email sending errors are logged but don't fail the function
- Database errors are caught and logged
- Invalid student/teacher data is skipped gracefully

## Monitoring

Monitor function execution through:
- Firebase Console > Functions > Logs
- Cloud Functions logs in Google Cloud Console
- Email delivery reports in SendGrid dashboard

## Security Considerations

1. **API Keys**: Store SendGrid API key in Firebase Functions config
2. **Authentication**: Manual trigger requires Bearer token
3. **Rate Limiting**: SendGrid has rate limits (check your plan)
4. **Data Access**: Functions only read/write necessary data

## Troubleshooting

### Common Issues

1. **Emails not sending**: Check SendGrid API key and sender email
2. **Function not running**: Verify Cloud Scheduler is enabled
3. **Permission errors**: Ensure Firebase Admin SDK is properly initialized
4. **Timezone issues**: Verify timezone configuration

### Debug Steps

1. Check function logs: `firebase functions:log`
2. Verify configuration: `firebase functions:config:get`
3. Test manual trigger with proper authentication
4. Check SendGrid dashboard for email delivery status

## Cost Considerations

- **Cloud Functions**: Pay per invocation and execution time
- **Cloud Scheduler**: Free tier includes 3 jobs
- **SendGrid**: Pay per email sent (check your plan)
- **Firestore**: Pay per read/write operation

## Support

For issues or questions:
1. Check Firebase Functions logs
2. Review SendGrid delivery reports
3. Verify Firestore data structure
4. Test with manual trigger function 