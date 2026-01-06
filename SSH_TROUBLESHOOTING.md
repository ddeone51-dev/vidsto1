# SSH Connection Troubleshooting - StackCP

If SSH hasn't activated after 30 minutes, try these steps:

---

## Step 1: Verify Your Public Key Was Added Correctly

1. **Go back to cPanel → SSH Access**
2. **Check if your key is listed** - you should see your public key displayed
3. **Verify the key matches** - it should start with `ssh-rsa` and end with `techland@stackcp`

---

## Step 2: Try Connecting Anyway

Sometimes the service activates but the message doesn't update. Try connecting:

```powershell
ssh techland.co.tz@ssh.us.stackcp.com
```

**What happens?**
- If it connects: ✅ Great! Skip to Step 3
- If you get an error: Note the exact error message and continue troubleshooting

---

## Step 3: Common Errors and Solutions

### Error: "Permission denied (publickey)"

**This means:**
- SSH service is active, but authentication failed
- Your key might not be added correctly
- Or the key format is wrong

**Solutions:**

1. **Double-check the key in cPanel:**
   - Make sure you copied the ENTIRE key (it's very long)
   - Make sure it starts with `ssh-rsa`
   - Make sure there are no extra spaces or line breaks

2. **Try regenerating and re-adding the key:**
   - Generate a new key
   - Delete the old one from cPanel
   - Add the new one
   - Wait a few minutes

3. **Check key format:**
   - The key should be on ONE line
   - No line breaks in the middle
   - Starts with `ssh-rsa` and ends with your email/comment

### Error: "Could not resolve hostname ssh.us.stackcp.com"

**This means:**
- DNS/network issue
- Or wrong hostname

**Solutions:**

1. **Try using IP address instead** (if StackCP provided one)
2. **Check your internet connection**
3. **Try from a different network** (mobile hotspot)

### Error: "Connection timed out" or "Connection refused"

**This means:**
- SSH service might not be enabled yet
- Or firewall blocking

**Solutions:**

1. **Contact StackCP Support** - ask them to:
   - Verify SSH is enabled for your account
   - Check if there are any restrictions
   - Verify your key was added correctly

2. **Check if SSH port (22) is blocked:**
   - Some networks block port 22
   - Try from a different network

---

## Step 4: Contact StackCP Support

If nothing works, contact StackCP support with this information:

**Subject:** SSH Access Not Working After Adding Public Key

**Message:**
```
Hello,

I added an SSH public key to my account (domain: techland.co.tz) more than 30 minutes ago, but I'm unable to connect via SSH.

Details:
- Hostname: ssh.us.stackcp.com
- Username: techland.co.tz
- I can see my public key is listed in cPanel → SSH Access
- Error message: [paste the exact error you get]

Could you please:
1. Verify SSH is enabled for my account
2. Check if my public key was added correctly
3. Verify the SSH service is running

Thank you!
```

---

## Step 5: Alternative - Use cPanel Terminal (If Available)

Some cPanel versions have a built-in terminal that doesn't require SSH keys:

1. **Look in your cPanel** for:
   - "Terminal"
   - "Web Terminal"
   - "Advanced → Terminal"

2. **If you see it**, click it - you might be able to access the server directly without SSH!

---

## Step 6: Verify Key Format

Let's make sure your key is correct. Run this in PowerShell:

```powershell
Get-Content $env:USERPROFILE\.ssh\id_rsa.pub
```

**The key should:**
- Start with: `ssh-rsa` (or `ssh-ed25519`)
- Be on ONE continuous line
- End with: `techland@stackcp` (or your comment)
- Be very long (hundreds of characters)

**If the key looks wrong**, regenerate it.

---

## Quick Test Commands

Try these to diagnose:

```powershell
# Test if you can reach the server
ping ssh.us.stackcp.com

# Try SSH with verbose output (shows detailed error)
ssh -v techland.co.tz@ssh.us.stackcp.com

# Try SSH with specific key file
ssh -i $env:USERPROFILE\.ssh\id_rsa techland.co.tz@ssh.us.stackcp.com
```

---

## Most Likely Issues

1. **Key not added correctly** - Most common issue
   - Solution: Delete and re-add the key in cPanel

2. **SSH service not enabled** - StackCP needs to enable it
   - Solution: Contact support

3. **Wrong username** - Make sure you're using `techland.co.tz` not your cPanel username
   - Solution: Double-check the username

4. **Network/firewall blocking** - Your network might block SSH
   - Solution: Try from different network

---

## Next Steps

1. **Try connecting** and note the exact error
2. **Check cPanel** to verify key is there
3. **Contact StackCP support** if still not working
4. **Or check if cPanel has Terminal option** (easier alternative)

Let me know what error you get when trying to connect!

