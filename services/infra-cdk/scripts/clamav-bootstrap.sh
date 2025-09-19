#!/bin/bash
apt-get update
apt-get install -y clamav clamav-daemon

# Setup SSH keys 
cat > /home/ubuntu/.ssh/authorized_keys << 'EOF'
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDaR+UVq61k14jcuSFfoCfTxvB1IyhU3IQFp4OjpiN4fYMBjE9USeNoHon2ux8VTvL0nRc7Zn4g9HemxiDjdawUxh2oJ8GOTsiFTEWic2nf90SnbjBMn1OZELvMiZzoYDjQFvEp+AgETBA5nhrbHyxWQWIBa7A+XqiqnX0lcZ1p+x8sLIl4F0e583lJeuPQPVkpCicf2GDdtG1TnPxltqJgGaeVSONivpxeVofJwG4DCXy1b1xSo1NG0gzy9BWFJwOWKmZAk6nYq+rcxZg+TgU1x5WJ6z8/CS0PMSoTMRRIejm734PSmkGCU+WkR139Dl8o3DvQh/VQD71fxw30aONG98PSBJEUd5IouuiPPNYGP+fuDWgCBkaoA6JKlSVtbneNt1Qkm10FFHqExqzGWaSDeUCh6da3WG1BW4KZcC3MQ8CTEG47LFqUG5TvhklhiAAJH7cGF9W9SU1Beq2A6Wx1R/yGvgH/7U6X0/QfJi1ljY32pPzP2S+gzzOVGJgrMz3qRRgNvcY5k8EMbIuTK2yanFFHuVaWQq/zZW1T376oyHMfWdBB9WAtIKwpCgA5kYUu0XCo3XM0fWibZFIa/cEBNSKH1gEFKCBXolsc2+c4iZtdbG4YCHLgzOOqklERMEeK5dXq9Rz7UjoE91UVIyO2/d+mXmiVDRgtUsiQ34Sxyw== mojo.talantikite@gmail.com
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCttm1LMpbYCjmDQaKrM2KWF2D/xKMWD2y8azKYiZZj2X6KvVCLFs5uskvcgqXJw4G8ePTWdcO1EqXtHG8yWUMFT6YptalmO5jnz18V9fArt9WttPAzZKB7V/KTs5TxvhQ5h59TCJQGoG0/C+LuDH0ZJWuBv1U/l8yBBmWCJu2b41Kq+Hvclv6eLb+0A14o447paknTOHDheKukx3y44yhEYSoVQcIlHm7vApxGGhhhoiWkrdN0a1U4npM8G1MHdNe0360zSVmmFV6FgxFZPmMOK+xKRHNCgJdd5/8Tua+DDckeYw1c4DYEw/nvvITQs855U35RFOeOLi54gWNtwmhMyJJe8r7+Ls/t/lpOe8o1alE6G+QNb7RV8GJ6kIxyYLiUEExmPzBCur8XsJctG9BWS/yBsmEnasqBaq2HHdQMlbKe/AoZgGPlVWbSFXnHkfVlme0NeZa2ya8Igj9xdoK6cgYM6W/zKlopfQV4fdkpcGq1grVOP4vT/gzLKD8clkU= macrae@KIHW10L6038
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDRrQOylmfnH6ptruU7nUzMvwkV6Q2WCFLJlGxbVTKlFiEepsSb4y/P3ZUL+regv8GZiZkWc+x1hiIGDQxF68nTSHv0G9otHeG44nrrQdeJ1rghy+eptyxIcAenUtP3eRhSR3c2/8IP7XPJutrFbQOADlQqwimKYrk1fdcONWt1TB1uPqk/i9mEdAcFn2VVQnWYbJ/mLwd0EPFqqnPFFnUzayaiYQnEZU9xLSSDYCurPEWuYDipJgyH0xsMloSwpV8U7m/v/4cPHU9E4NpnNY4Ke5DNljeqmZxQWbwZMGTWSYt7um3Zn5entr9iWJf0uu5nC03YPl3mgMxeu5wuui2HKiJBQCL1Yinz7ErRm7vR/Q11F8q3vyxey3tjNaMV7wMibtuQZh2ZdCGMlisoM9G44nS/EwDuuvt6PT87fgr2ur2SucOw52NokC6eO49DqXQXB5AVFnFoUMXTEQxz4Jq4uoEP9fz7cJVHrY5LVmtwy1yxoLujldhlRTg+G6bKOnY8embgFMJ+lBI8/R1N0f2r4EkTp3GwMgsDkZs3H/djaQMEdK7daKGYltwnXPiOR1Q0PNnnGMOctE9hSojiV1FX80aycYFEjmkOZzqUHJHgm6OPzYRC+CB5/OEBT+1MPjPcOXmMGa6JrNyc/LJeA5GOlj9JzRO3fOHnp4DlA4ZHEw== maolin@Maos-MacBook-Pro.local
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDiKdvKxI2HkraeNla7tFTEijQzQzeBy5Ss044+dV9uhPqVNlRQakFpRwReOQRj1drK5Nyk48r6CXMomT0u74MtGqma+17lvFPxXc+6WywwzeXNEWAvmqniB6hsNs+ysyGJuYa3rNuGzUuwxoe1I6ANtI+nIU67J2UHoHp8XATush2w+flVnprUOJBzYiT3xLrPr6NdW+LKUb3+Vyqwx7sc7wZ1Y1eCNRbC/+aVXxt/lQyTxLn5I4beedIUQ6I6jezNdB8yg5GfpNDvwH25d0Z6V1XFkKzCRSNizgfbC4l2lFCZvLc4+3tdbu7pnkW4mSqHlgqnAn+qONsNovzg9Igq7fMfyxU9VZXKXSBMOIem5QKyFQ4mFgrW7RxLt5VX9tjQ7ImsBx77p1qe0CskEX9knZu3bzETFaqAEuVo7/pHu/aMwlsZtuG8cAY+/2AktVc3Twlz01RoGRLULz8YB7oY7uhHKF4U+eLin6dFmrfNHHlsKCR1LUV4BPGYi6V41GM= worku@hiilaptop.lan
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDAk11E+dW51OKueXqW5fQmqAzjeJJVwob8QtiEh5JWAb7RRl7R67pRsoYRGQUp01D6PviEWlGU0gVoBENqhrM18sQCAH9oXoAn1hjwek8tXwh8oUJrGgUJOD/ZaHsRr5oLWUdSB7uYHw17B8VdcuK2EhEQx3dV6uS8ts1Kh+lqb3gdaS5BSQffKszY18TT9Mx9UgP2dwfEqr9cf40K5pm8l3M4G5grJK4taKKG8DopjBjQTMCOK44PBC77BkoEbzJPj+hQ1aZSlPsqcGcGFnzJyhwJkR2WeB5MyIN0eu2y4JKQ4vJWPINR4Jq7CTHtJsZUa39LNl5dJY1MuOFD1v/G4Zj+WsnLMAEpGaSUQ3ZoBC2aya2jfO972e41jNci4NfOtvNiycyJSAg6e6rRu7mfaLag2OUc7ZdAwWcamrYxnWWQjFGaVIzbgn4GHifJ0gtfsKYFHz/8UQctW44G5S3U8Du9UHKA//PaF8MWtLY9fNI6RnF2VlAuT2FiyoqbF5U= meghanmurphy@meghans-mbp.lan
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCpKV/Qu1f9lv1OP0kiCvh56hRpGLOU6gSwPgvzglyak3mR8ec4quAcctaCgfOl/5dm7a3dhkY6WSCO09lSpixsNGiDEuGuESHis8GGOaepjq3jgrD7CkRvdSU8725XPNVwC9nZiUqgYbl8lCoCofCaTovKG1tiXTAMl6+RhRbv6AaJKOh+EYabmS0hTT/nv1QJ1P9aoMfMpx+FBFMDiCktjdsuPq5wLSVe9pxbzWI9PCTN55sRaBjbRcFdUdy+pT4B/lAKxJ5z7Oxq6QBI+SvvdnfPmkrCOg+9pEftuyLT+fURnsCIcs2DQJz2Pjkdv8xxwTNWB1+qfWC+LyJ934jcykJGtV/r4GZ2VzXGz0t7z7PgbkIdFHL3dg/JYR7cQdiCFwIa0Ml7bL5rKuQjNWXOBmCHME2lBol8jT1U1plYTjbz4kA6iCrfzgvQ5/MpkOfxRhLkSnYMCmYMOiRNskAW+FdZO5RD/0IFv0s0RUoJpD35Qt6TxBBP6TM0qPhuUlmTPQpWWTSwc/lSzVsEjSrAc/CxevC57A12JAsUcPFVljjAP+hjuGaHq41p2CrFyLqdIsP0td0uXk9CFUe+IuFGFP9OfhN/Kf/HOXWlE0YD1ZmV0k5sg1cEnyC0fusT9Tz0y/8MjzrJVjZBEvEEjlhk/aeo4Y6XLhVmGlMSXoYkgw== pearlroos@Pearls-MacBook-Pro.local
EOF
chown ubuntu:ubuntu /home/ubuntu/.ssh/authorized_keys
chmod 600 /home/ubuntu/.ssh/authorized_keys

# Configure clamd for TCP mode (disable Unix socket, enable TCP)
sed -i 's/^LocalSocket/#LocalSocket/' /etc/clamav/clamd.conf
sed -i 's/^FixStaleSocket/#FixStaleSocket/' /etc/clamav/clamd.conf
sed -i 's/^LocalSocketGroup/#LocalSocketGroup/' /etc/clamav/clamd.conf
sed -i 's/^LocalSocketMode/#LocalSocketMode/' /etc/clamav/clamd.conf
echo "TCPSocket 3310" >> /etc/clamav/clamd.conf
echo "TCPAddr 0.0.0.0" >> /etc/clamav/clamd.conf 
sed -i 's/^StreamMaxLength .*/StreamMaxLength 50M/' /etc/clamav/clamd.conf

# Create a systemd service override to delay the start
cat <<EOF > /etc/systemd/system/clamav-daemon.service.d/override.conf
[Unit]
After=network.target
EOF

# Create a systemd service override to delay the start and set restart limits
cat <<EOF > /etc/systemd/system/clamav-daemon.service.d/override.conf
[Unit]
After=network.target
StartLimitIntervalSec=1h
StartLimitBurst=5
Requires=
EOF

# Create TCP override to disable socket activation
cat <<EOF > /etc/systemd/system/clamav-daemon.service.d/tcp-override.conf
[Unit]
Requires=
After=network.target

[Install]
Also=
EOF

# Disable and mask the socket to force TCP mode
systemctl disable clamav-daemon.socket
systemctl mask clamav-daemon.socket

# Fix the systemctl setting
sed -i 's/^StandardOutput=syslog/StandardOutput=journal/' /lib/systemd/system/clamav-daemon.service

# Reload systemd to apply the changes
systemctl daemon-reload

# Enable services for auto-start
systemctl enable clamav-daemon
systemctl enable clamav-freshclam

# Start freshclam first to download virus definitions
systemctl start clamav-freshclam

# Wait for virus definitions to be downloaded
echo "Waiting for virus definitions to download..."
timeout=300  # 5 minutes timeout
counter=0
while [ ! -f /var/lib/clamav/daily.cvd ] && [ ! -f /var/lib/clamav/daily.cld ] && [ $counter -lt $timeout ]; do
    sleep 5
    counter=$((counter + 5))
    echo "Still waiting for virus definitions... ($counter seconds)"
done

# Check if definitions were downloaded
if [ -f /var/lib/clamav/daily.cvd ] || [ -f /var/lib/clamav/daily.cld ]; then
    echo "Virus definitions downloaded successfully. Starting clamav-daemon..."
    systemctl start clamav-daemon
    
    # Wait a moment for daemon to start
    sleep 5
    
    # Confirm we're up
    systemctl status clamav-daemon
    systemctl status clamav-freshclam
else
    echo "ERROR: Virus definitions not downloaded within timeout. ClamAV daemon not started."
    systemctl status clamav-freshclam
fi