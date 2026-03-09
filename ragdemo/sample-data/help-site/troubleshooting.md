# Troubleshooting Guide

## Login Issues

### Cannot Log In

**Symptoms**: Login fails with incorrect credentials message

**Solutions**:
1. Verify your email address is correct
2. Check if Caps Lock is on
3. Try the "Forgot Password" link
4. Clear browser cache and cookies
5. Try a different browser
6. Check if your account is locked (after 5 failed attempts)

**Prevention**: Use a password manager to avoid typos

---

### Account Locked

**Symptoms**: Message saying account is locked after multiple failed login attempts

**Solutions**:
1. Wait 30 minutes for automatic unlock
2. Use "Forgot Password" to reset immediately
3. Contact support for manual unlock

---

### Two-Factor Authentication Not Working

**Symptoms**: 2FA code not accepted

**Solutions**:
1. Ensure device time is synchronized
2. Wait for new code to generate
3. Use backup codes if available
4. Regenerate 2FA setup if codes never work

**To disable 2FA**: Contact support with identity verification

---

## Product Management Issues

### Products Not Showing on Store

**Symptoms**: Products added but not visible to customers

**Checklist**:
- [ ] Product status is "Active"
- [ ] Inventory quantity > 0
- [ ] Product is assigned to a collection
- [ ] Visibility settings are correct
- [ ] Cache has been cleared

**Solutions**:
1. Check product status: Products → [Product Name] → Status
2. Verify inventory: Products → [Product Name] → Inventory
3. Clear cache: Settings → Cache → Clear All
4. Check visibility: Products → [Product Name] → Visibility

---

### Image Upload Fails

**Symptoms**: Error when uploading product images

**Common causes**:
- File size too large (max 5MB)
- Unsupported format (use JPG, PNG, or WebP)
- Poor internet connection

**Solutions**:
1. Compress images before uploading
2. Convert to supported format
3. Upload one image at a time
4. Check internet connection

**Recommended tools**:
- TinyPNG for compression
- CloudConvert for format conversion

---

### Bulk Import Errors

**Symptoms**: CSV import fails or imports partially

**Common issues**:
1. **Wrong format**: Use our CSV template
2. **Missing required fields**: SKU, name, price are required
3. **Invalid data**: Check formatting of numbers and dates
4. **Special characters**: Ensure UTF-8 encoding

**Solutions**:
1. Download CSV template: Products → Import → Download Template
2. Validate data before import
3. Test with small batch first (10 products)
4. Check error log after import attempt

---

## Order Issues

### Order Not Received

**Symptoms**: Customer placed order but didn't receive confirmation

**Checklist**:
- [ ] Check spam/junk folder
- [ ] Verify email address in order
- [ ] Check order status in dashboard
- [ ] Verify email service is working

**Solutions**:
1. Resend confirmation: Orders → [Order ID] → Resend Email
2. Update customer email if incorrect
3. Check email service status: Settings → Notifications → Test Email

---

### Payment Failed

**Symptoms**: Order stuck in "Payment Pending" status

**Common causes**:
- Insufficient funds
- Card declined by bank
- Payment gateway timeout
- Address verification failure

**Solutions**:
1. Contact customer to retry payment
2. Send payment link: Orders → [Order ID] → Send Payment Link
3. Process manual payment (if authorized)
4. Check payment gateway status

---

### Cannot Cancel Order

**Symptoms**: Cancel button disabled or error when canceling

**Reasons**:
- Order already shipped
- Order already refunded
- Payment still processing

**Solutions**:
1. If shipped: Process return instead
2. If processing: Wait 5 minutes and retry
3. Contact support for stuck orders

---

### Shipping Label Won't Generate

**Symptoms**: Error or timeout when creating shipping label

**Solutions**:
1. Verify shipping address is complete
2. Check carrier integration status
3. Ensure package dimensions are entered
4. Verify carrier account balance
5. Try different carrier

**Error codes**:
- `INVALID_ADDRESS`: Fix address formatting
- `RATE_NOT_AVAILABLE`: Try different service level
- `AUTHENTICATION_FAILED`: Reconnect carrier account

---

## Payment Issues

### Payment Gateway Disconnected

**Symptoms**: "Payment gateway error" on checkout

**Solutions**:
1. Reconnect gateway: Settings → Payments → Reconnect
2. Verify API credentials
3. Check gateway account status
4. Test with small transaction

---

### Refund Failed

**Symptoms**: Refund attempt returns error

**Common causes**:
- Original payment too old (>180 days)
- Insufficient balance in account
- Payment method no longer valid

**Solutions**:
1. Process manual refund via gateway dashboard
2. Issue store credit instead
3. Send direct payment via PayPal/Venmo

---

## Performance Issues

### Slow Dashboard Loading

**Symptoms**: Dashboard takes >10 seconds to load

**Solutions**:
1. Clear browser cache
2. Disable browser extensions
3. Close unused browser tabs
4. Check internet speed
5. Try incognito/private mode

**Performance tips**:
- Use Chrome or Firefox
- Keep browser updated
- Avoid 100+ tabs open

---

### API Rate Limiting

**Symptoms**: API returns 429 status code

**Current limits**:
- Starter: 100 requests/minute
- Professional: 1000 requests/minute
- Enterprise: 10,000 requests/minute

**Solutions**:
1. Implement exponential backoff
2. Cache responses when possible
3. Batch requests
4. Upgrade plan for higher limits

**Example backoff code**:
```javascript
async function retryRequest(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        await sleep(Math.pow(2, i) * 1000);
      } else {
        throw error;
      }
    }
  }
}
```

---

## Integration Issues

### Webhook Not Receiving Events

**Symptoms**: Webhook endpoint not being called

**Debugging steps**:
1. Verify endpoint URL is correct
2. Check endpoint is publicly accessible
3. Ensure endpoint returns 200 status
4. Review webhook logs: Settings → Webhooks → Logs
5. Test with webhook.site

**Common issues**:
- HTTPS required (not HTTP)
- Firewall blocking CloudStore IPs
- Endpoint timeout (must respond in <10s)

---

### Shopify Import Failed

**Symptoms**: Error when importing from Shopify

**Solutions**:
1. Verify Shopify API credentials
2. Check private app permissions
3. Ensure store is active
4. Try smaller batch size
5. Check Shopify API rate limits

---

## Mobile App Issues

### App Won't Sync

**Symptoms**: Changes not reflected in mobile app

**Solutions**:
1. Pull down to refresh
2. Force close and reopen app
3. Check internet connection
4. Clear app cache: Settings → Clear Cache
5. Reinstall app (last resort)

---

### Barcode Scanner Not Working

**Symptoms**: Scanner can't read barcodes

**Solutions**:
1. Grant camera permissions
2. Clean camera lens
3. Ensure good lighting
4. Hold steady, 6-10 inches away
5. Try manual SKU entry

---

## Getting More Help

If these solutions don't resolve your issue:

1. **Check system status**: status.cloudstore.com
2. **Search knowledge base**: help.cloudstore.com
3. **Contact support**: 
   - Email: support@cloudstore.com
   - Chat: Available in dashboard
   - Phone: 1-800-CLOUD-99 (Enterprise only)

When contacting support, include:
- Account email
- Order ID or product SKU (if relevant)
- Steps to reproduce issue
- Screenshots of errors
- Browser/device information
