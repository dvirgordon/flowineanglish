#!/bin/bash

# Payment Reminder Cloud Functions Deployment Script
# This script sets up and deploys the payment reminder functions

echo "🚀 Starting Payment Reminder Cloud Functions Deployment..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ You are not logged in to Firebase. Please run:"
    echo "firebase login"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if configuration is set
echo "🔧 Checking configuration..."

# Check SendGrid configuration
if ! firebase functions:config:get sendgrid.key &> /dev/null; then
    echo "⚠️  SendGrid API key not configured."
    echo "Please set it with:"
    echo "firebase functions:config:set sendgrid.key=\"YOUR_SENDGRID_API_KEY\""
    echo "firebase functions:config:set sendgrid.from_email=\"noreply@yourdomain.com\""
    echo ""
    read -p "Do you want to continue without SendGrid configuration? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check app configuration
if ! firebase functions:config:get app.dashboard_url &> /dev/null; then
    echo "⚠️  App configuration not set."
    echo "Please set it with:"
    echo "firebase functions:config:set app.dashboard_url=\"https://your-app-url.com/student.html\""
    echo "firebase functions:config:set app.secret_key=\"YOUR_SECRET_KEY\""
    echo ""
    read -p "Do you want to continue without app configuration? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Deploy functions
echo "🚀 Deploying Cloud Functions..."
firebase deploy --only functions

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Configure SendGrid API key if not done:"
    echo "   firebase functions:config:set sendgrid.key=\"YOUR_SENDGRID_API_KEY\""
    echo "   firebase functions:config:set sendgrid.from_email=\"noreply@yourdomain.com\""
    echo ""
    echo "2. Configure app settings if not done:"
    echo "   firebase functions:config:set app.dashboard_url=\"https://your-app-url.com/student.html\""
    echo "   firebase functions:config:set app.secret_key=\"YOUR_SECRET_KEY\""
    echo ""
    echo "3. Test the manual trigger:"
    echo "   curl -X POST https://your-region-your-project.cloudfunctions.net/manualPaymentReminder \\"
    echo "     -H \"Authorization: Bearer YOUR_SECRET_KEY\""
    echo ""
    echo "4. Monitor function logs:"
    echo "   firebase functions:log"
    echo ""
    echo "🎉 Payment reminder system is now active!"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi 