# Setting Up SSH Keys for StackCP

StackCP uses SSH key authentication. Follow these steps to set it up on Windows.

---

## Step 1: Generate SSH Key Pair (Windows)

### Option A: Using PowerShell (Windows 10/11 - Recommended)

1. **Open PowerShell** (as regular user, not admin)
2. **Check if you already have SSH keys**:
   ```powershell
   Test-Path ~/.ssh/id_rsa.pub
   ```
   
   If it says `True`, you already have a key! Skip to Step 2.
   
   If it says `False`, create a new key:

3. **Generate SSH key**:
   ```powershell
   ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
   ```
   
   - When prompted: **Press Enter** to accept default file location (`C:\Users\YourUsername\.ssh\id_rsa`)
   - When prompted for passphrase: **Press Enter twice** (no passphrase, or create one if you prefer)
   
4. **Your key is created!** ✅

### Option B: Using Git Bash (if you have Git installed)

1. Open **Git Bash**
2. Run:
   ```bash
   ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
   ```
3. Follow the same prompts as above

---

## Step 2: Get Your Public Key

### Using PowerShell:

```powershell
Get-Content ~/.ssh/id_rsa.pub
```

### Using Command Prompt:

```cmd
type %USERPROFILE%\.ssh\id_rsa.pub
```

### Using Git Bash:

```bash
cat ~/.ssh/id_rsa.pub
```

**Copy the entire output** - it should look like:
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQ... (long string of characters) ... your-email@example.com
```

---

## Step 3: Add Public Key to StackCP

1. **Go back to your cPanel SSH Access page**
2. **Paste your public key** into the "Public Key" field
3. **Click "Add" or "Save"**
4. **Wait up to 30 minutes** for SSH service to activate (as mentioned in the message)

---

## Step 4: Connect to SSH

Once the SSH service is activated (after the 30-minute wait, or instantly if you already had a key):

### Using PowerShell:

```powershell
ssh techland.co.tz@ssh.us.stackcp.com
```

### Using Command Prompt:

```cmd
ssh techland.co.tz@ssh.us.stackcp.com
```

### Using Git Bash:

```bash
ssh techland.co.tz@ssh.us.stackcp.com
```

**First time connection:**
- You'll see a message about authenticity of host - type `yes` and press Enter
- You should be connected! ✅

---

## Troubleshooting

### "Permission denied (publickey)"

**If you get this error:**

1. **Make sure you're using the correct username**: `techland.co.tz` (not your cPanel username)
2. **Make sure you added the PUBLIC key** (id_rsa.pub), not the private key (id_rsa)
3. **Wait the full 30 minutes** if this is your first key
4. **Check key format** - make sure you copied the entire key, starting with `ssh-rsa` or `ssh-ed25519`

### "Could not resolve hostname"

- Make sure you're using: `ssh.us.stackcp.com` (as shown in your cPanel)

### "ssh: command not found" (Windows)

If PowerShell doesn't recognize `ssh` command:

1. **Windows 10/11 usually has SSH built-in**, but if not:
2. **Install OpenSSH Client**:
   - Settings → Apps → Optional Features → Add a feature
   - Search for "OpenSSH Client"
   - Install it
3. **Or use Git Bash** (if you have Git installed)

---

## Quick Reference

**Connection Details:**
- **Host**: `ssh.us.stackcp.com`
- **Username**: `techland.co.tz`
- **Port**: 22 (default)

**Key Location (Windows):**
- Private key: `C:\Users\YourUsername\.ssh\id_rsa` (DO NOT SHARE THIS!)
- Public key: `C:\Users\YourUsername\.ssh\id_rsa.pub` (This is what you add to cPanel)

---

## Next Steps After Connecting

Once you're connected via SSH, you can follow the `QUICK_SSH_SETUP.md` guide to:
1. Check/install Node.js
2. Set up your backend
3. Install dependencies
4. Configure and run your server

---

## Security Note

- **NEVER share your private key** (`id_rsa`) - keep it secret!
- The **public key** (`id_rsa.pub`) is safe to share/add to servers
- If you lose your private key, you'll need to generate a new pair and add the new public key to StackCP

