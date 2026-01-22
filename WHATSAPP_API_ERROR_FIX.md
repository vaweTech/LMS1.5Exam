# WhatsApp API "API access blocked" Error Fix

## Error Analysis

### Error Message
```
{
  status: 400,
  statusText: 'Bad Request',
  error: {
    error: {
      message: 'API access blocked.',
      type: 'OAuthException',
      code: 200,
      fbtrace_id: '...'
    }
  }
}
```

### Root Cause
This error occurs when the WhatsApp Cloud API rejects your request due to authentication/authorization issues. The error code `200` with `OAuthException` type typically indicates:

1. **Expired or Invalid Access Token** - Most common cause
2. **Missing App Permissions** - App doesn't have required permissions
3. **Suspended WhatsApp Business Account** - Account is restricted
4. **Token Mismatch** - Token doesn't match the Phone Number ID
5. **Rate Limiting** - Temporary block due to too many requests

### Where It Occurs
- `app/api/send-whatsapp-otp/route.js` - When sending OTP messages
- `app/api/send-whatsapp-template/route.js` - When sending template messages
- `app/api/admin/fee-reminders/route.js` - When sending automated fee reminders

## Solution Implemented

### 1. Enhanced Error Detection
Added specific handling for error code `200` and `OAuthException` type in all three API routes.

### 2. User-Friendly Error Messages
- Clear explanation of what "API access blocked" means
- Step-by-step troubleshooting guide
- Specific hint to regenerate tokens

### 3. Detailed Error Information
- Returns error code and type in response
- Includes helpful hints for resolution
- Logs full error details for debugging

## Files Modified

1. **app/api/send-whatsapp-otp/route.js**
   - Added error code 200 handling
   - Enhanced error messages for OAuth exceptions

2. **app/api/send-whatsapp-template/route.js**
   - Added error code 200 handling
   - Enhanced error messages for OAuth exceptions

3. **app/api/admin/fee-reminders/route.js**
   - Added error code 200 handling in sendWhatsAppTemplate function
   - Better error propagation

## How to Fix the Issue

### Step 1: Check Your Access Token
1. Go to [Facebook Business Manager](https://business.facebook.com)
2. Navigate to **WhatsApp > API Setup**
3. Check if your access token is still valid
4. Look for any expiration warnings

### Step 2: Regenerate Access Token
1. In Facebook Business Manager, go to **WhatsApp > API Setup**
2. Click on **Temporary** or **System User** token
3. Generate a new **Permanent Token** (recommended)
4. Copy the new token

### Step 3: Update Environment Variables
Update your `.env` or environment variables:

```env
WHATSAPP_CLOUD_API_TOKEN=your_new_permanent_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
```

### Step 4: Verify Phone Number ID
1. Ensure `WHATSAPP_PHONE_NUMBER_ID` matches the phone number ID in your WhatsApp Business account
2. The phone number ID should be a numeric string (e.g., `810010752196723`)

### Step 5: Check App Permissions
1. Go to **App Dashboard** in Facebook Developers
2. Navigate to **App Review > Permissions and Features**
3. Ensure `whatsapp_business_messaging` permission is approved
4. Check that your app is not in development mode restrictions

### Step 6: Verify WhatsApp Business Account Status
1. Check if your WhatsApp Business Account is active
2. Look for any suspension notices
3. Ensure all required verifications are complete

### Step 7: Test with New Token
1. Restart your development server
2. Test sending a WhatsApp message
3. Check server logs for any remaining errors

## Environment Variables Required

Make sure these are set in your environment:

```env
# Required
WHATSAPP_CLOUD_API_TOKEN=your_permanent_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Optional (for templates)
WHATSAPP_BLOCK_TEMPLATE_NAME=temporarily_blocked
WHATSAPP_FEE_TEMPLATE_NAME=fee_update_notification
WHATSAPP_TEMPLATE_LANGUAGE=en_US
```

## Token Types

### Temporary Token (Not Recommended)
- Expires after 24 hours
- Requires frequent regeneration
- Good for testing only

### Permanent Token (Recommended)
- Never expires (unless manually revoked)
- Generated from System User
- Best for production use

### How to Generate Permanent Token
1. Go to Facebook Business Manager
2. Navigate to **Business Settings > Users > System Users**
3. Create a System User (if not exists)
4. Assign WhatsApp permissions to System User
5. Generate token from System User
6. Set token expiration to **Never** (if available)

## Common Issues and Solutions

### Issue: Token Works But Gets Blocked Randomly
**Solution**: Check rate limits. WhatsApp has strict rate limits:
- Standard tier: 1,000 conversations per 24 hours
- Higher tiers available for more volume

### Issue: Token Works in Test But Not Production
**Solution**: 
- Ensure app is approved for production
- Check app review status
- Verify all permissions are granted

### Issue: Specific Templates Fail
**Solution**:
- Ensure template is approved in WhatsApp Business Manager
- Check template name spelling matches exactly
- Verify template language code is correct

## Testing

After fixing the token:

1. **Test OTP Sending**:
   ```bash
   curl -X POST http://localhost:3000/api/send-whatsapp-otp \
     -H "Content-Type: application/json" \
     -d '{"phone": "+919703589296"}'
   ```

2. **Check Server Logs**:
   - Look for successful message sending
   - Verify message ID is returned
   - Check for any remaining errors

3. **Test Template Messages**:
   - Use the admin panel to send test messages
   - Verify templates are approved
   - Check message delivery status

## Prevention

1. **Use Permanent Tokens**: Always use permanent tokens for production
2. **Monitor Token Expiration**: Set up alerts for token expiration
3. **Rate Limit Handling**: Implement rate limit checking in your code
4. **Error Monitoring**: Set up error tracking for WhatsApp API failures
5. **Regular Token Rotation**: Rotate tokens periodically for security

## Additional Resources

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Facebook Business Manager](https://business.facebook.com)
- [WhatsApp Business API Setup Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)

## Notes

- Error code `200` is misleading - it's actually an error, not success
- Always check the `type` field - `OAuthException` indicates auth issues
- The `fbtrace_id` can be used for debugging with Facebook support
- Temporary blocks usually resolve within 24 hours

