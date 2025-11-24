# IntaSend Configuration
# Get your API keys from https://intasend.com/ dashboard

# Publishable Key (starts with ISPubKey_test_ for sandbox or ISPubKey_live_ for production)
INTASEND_PUBLISHABLE_KEY=ISPubKey_test_xxxxxxxx

# Secret Key (starts with ISSecretKey_test_ for sandbox or ISSecretKey_live_ for production)
INTASEND_SECRET_KEY=ISSecretKey_test_xxxxxxxx

# Test Mode (true for sandbox, false for production)
INTASEND_TEST_MODE=true

# Email Configuration (for nodemailer)
# Use your email provider settings (Gmail, SendGrid, etc.)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@justintime.com

# Note: For Gmail, use App Password instead of regular password
# Generate at: https://myaccount.google.com/apppasswords
