const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// Initialize Firebase Admin
admin.initializeApp();

// Initialize SendGrid with API key
// You'll need to set this in Firebase Functions config
sgMail.setApiKey(functions.config().sendgrid.key);

const db = admin.firestore();

/**
 * Scheduled Cloud Function that runs every 2 days
 * Scans payments collection for unpaid balances and sends reminder emails
 */
exports.sendPaymentReminders = functions.pubsub
  .schedule('every 2 days')
  .timeZone('Asia/Jerusalem')
  .onRun(async (context) => {
    try {
      console.log('Starting payment reminder process...');
      
      // Get current date
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
      
      // Get all payments with unpaid balances
      const paymentsSnapshot = await db.collection('payments')
        .where('isFullyPaid', '==', false)
        .get();
      
      if (paymentsSnapshot.empty) {
        console.log('No unpaid payments found.');
        return null;
      }
      
      const reminderPromises = [];
      let emailsSent = 0;
      
      for (const paymentDoc of paymentsSnapshot.docs) {
        const paymentData = paymentDoc.data();
        
        // Check if payment was updated more than 2 days ago
        const lastUpdated = paymentData.updatedAt ? paymentData.updatedAt.toDate() : paymentData.createdAt?.toDate();
        
        if (!lastUpdated || lastUpdated < twoDaysAgo) {
          try {
            // Get student information
            const studentDoc = await db.collection('users').doc(paymentData.studentId).get();
            
            if (!studentDoc.exists) {
              console.log(`Student ${paymentData.studentId} not found, skipping...`);
              continue;
            }
            
            const studentData = studentDoc.data();
            
            // Calculate balance
            const balance = await calculateStudentBalance(paymentData.studentId, paymentData.month);
            
            if (balance > 0) {
              // Send reminder email
              const emailPromise = sendPaymentReminderEmail(
                studentData.email,
                studentData.username,
                paymentData.month,
                balance,
                paymentData.amountPaid || 0
              );
              
              reminderPromises.push(emailPromise);
              emailsSent++;
              
              // Update payment record to track reminder sent
              await paymentDoc.ref.update({
                lastReminderSent: admin.firestore.FieldValue.serverTimestamp(),
                reminderCount: (paymentData.reminderCount || 0) + 1
              });
              
              console.log(`Reminder sent to ${studentData.email} for month ${paymentData.month}`);
            }
          } catch (error) {
            console.error(`Error processing payment ${paymentDoc.id}:`, error);
          }
        }
      }
      
      // Wait for all emails to be sent
      await Promise.all(reminderPromises);
      
      console.log(`Payment reminder process completed. ${emailsSent} emails sent.`);
      
      return { emailsSent };
      
    } catch (error) {
      console.error('Error in payment reminder function:', error);
      throw error;
    }
  });

/**
 * Calculate student's balance for a specific month
 */
async function calculateStudentBalance(studentId, month) {
  try {
    // Get all confirmed classes for the student in the specified month
    const classesSnapshot = await db.collection('classes')
      .where('studentId', '==', studentId)
      .where('status', '==', 'confirmed')
      .get();
    
    let totalAmount = 0;
    
    for (const classDoc of classesSnapshot.docs) {
      const classData = classDoc.data();
      
      // Check if class is in the specified month
      if (classData.date && classData.date.startsWith(month)) {
        // Get teacher's price per class
        const teacherDoc = await db.collection('users').doc(classData.teacherId).get();
        
        if (teacherDoc.exists) {
          const teacherData = teacherDoc.data();
          if (teacherData.pricePerClass) {
            totalAmount += parseFloat(teacherData.pricePerClass);
          }
        }
      }
    }
    
    // Get payment record
    const paymentDoc = await db.collection('payments')
      .doc(`payment_${studentId}_${month}`)
      .get();
    
    const amountPaid = paymentDoc.exists ? (paymentDoc.data().amountPaid || 0) : 0;
    
    return Math.max(0, totalAmount - amountPaid);
    
  } catch (error) {
    console.error('Error calculating student balance:', error);
    return 0;
  }
}

/**
 * Send payment reminder email using SendGrid
 */
async function sendPaymentReminderEmail(email, studentName, month, balance, amountPaid) {
  try {
    const monthName = new Date(month + '-01').toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
    
    const emailContent = {
      to: email,
      from: functions.config().sendgrid.from_email || 'noreply@flowenglish.com',
      subject: `Payment Reminder - ${monthName} Classes`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Flow English</h1>
            <p style="margin: 10px 0 0 0;">Payment Reminder</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">Hello ${studentName},</h2>
            
            <p style="color: #666; line-height: 1.6;">
              This is a friendly reminder about your outstanding payment for your English classes in <strong>${monthName}</strong>.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
              <h3 style="margin-top: 0; color: #333;">Payment Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Month:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${monthName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Amount Paid:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">$${amountPaid.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Balance Due:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #dc3545; font-weight: bold;">$${balance.toFixed(2)}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Please log into your student dashboard to make your payment or contact us if you have any questions.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${functions.config().app.dashboard_url || 'https://your-app-url.com/student.html'}" 
                 style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to Dashboard
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 14px;">
              Thank you for choosing Flow English for your language learning journey!
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated reminder. Please do not reply to this email.
              <br>
              If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      `,
      text: `
        Flow English - Payment Reminder
        
        Hello ${studentName},
        
        This is a friendly reminder about your outstanding payment for your English classes in ${monthName}.
        
        Payment Summary:
        - Month: ${monthName}
        - Amount Paid: $${amountPaid.toFixed(2)}
        - Balance Due: $${balance.toFixed(2)}
        
        Please log into your student dashboard to make your payment or contact us if you have any questions.
        
        Thank you for choosing Flow English!
        
        This is an automated reminder. Please do not reply to this email.
      `
    };
    
    await sgMail.send(emailContent);
    console.log(`Payment reminder email sent to ${email}`);
    
  } catch (error) {
    console.error(`Error sending email to ${email}:`, error);
    throw error;
  }
}

/**
 * Manual trigger function for testing payment reminders
 */
exports.manualPaymentReminder = functions.https.onRequest(async (req, res) => {
  try {
    // Check if request is authorized (you can add your own auth logic here)
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${functions.config().app.secret_key}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Run the payment reminder logic
    const result = await exports.sendPaymentReminders.run();
    
    res.json({ 
      success: true, 
      message: 'Payment reminders sent successfully',
      result 
    });
    
  } catch (error) {
    console.error('Error in manual payment reminder:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * Function to stop sending reminders for a specific payment
 * This can be called when a payment is marked as fully paid
 */
exports.stopPaymentReminders = functions.firestore
  .document('payments/{paymentId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    
    // Check if payment was marked as fully paid
    if (newData.isFullyPaid && !previousData.isFullyPaid) {
      try {
        // Update the payment record to stop reminders
        await change.after.ref.update({
          remindersStopped: true,
          remindersStoppedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Payment reminders stopped for ${context.params.paymentId}`);
        
      } catch (error) {
        console.error('Error stopping payment reminders:', error);
      }
    }
    
    return null;
  }); 