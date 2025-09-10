#!/bin/bash
set -e

# Update system
yum update -y

# Install ClamAV
yum install -y clamav clamav-daemon clamav-freshclam

# Configure ClamAV daemon
cat > /etc/clamd.d/scan.conf << 'EOF'
LogFile /var/log/clamd.scan
LogFileMaxSize 2M
LogTime yes
LogClean no
LogSyslog yes
LogFacility LOG_LOCAL6
LogVerbose yes
ExtendedDetectionInfo yes
PidFile /run/clamd.scan/clamd.pid
LocalSocket /run/clamd.scan/clamd.sock
FixStaleSocket yes
TCPSocket 3310
TCPAddr 0.0.0.0
MaxConnectionQueueLength 15
StreamMaxLength 100M
MaxThreads 12
ReadTimeout 180
CommandReadTimeout 30
SendBufTimeout 200
MaxQueue 100
IdleTimeout 30
ExcludePath ^/proc/
ExcludePath ^/sys/
SelfCheck 3600
User clamscan
DatabaseDirectory /var/lib/clamav
OfficialDatabaseOnly no
LocalDatabase /var/lib/clamav
TemporaryDirectory /tmp
DetectPUA yes
ScanPE yes
ScanELF yes
ScanOLE2 yes
ScanPDF yes
ScanHTML yes
ScanMail yes
PhishingSignatures yes
PhishingScanURLs yes
HeuristicScanPrecedence yes
StructuredDataDetection yes
CommandReadTimeout 120
StructuredMinCreditCardCount 3
StructuredMinSSNCount 3
StructuredSSNFormatNormal yes
StructuredSSNFormatStripped yes
ScanArchive yes
AlertBrokenExecutables yes
AlertBrokenMedia yes
AlertEncrypted yes
AlertEncryptedArchive yes
AlertEncryptedDoc yes
AlertOLE2Macros yes
AlertPhishingSSLMismatch yes
AlertPhishingCloak yes
AlertPartitionIntersection yes
EOF

# Configure freshclam
cat > /etc/freshclam.conf << 'EOF'
UpdateLogFile /var/log/freshclam.log
LogVerbose yes
LogSyslog yes
LogFacility LOG_LOCAL6
LogFileMaxSize 2M
LogRotate yes
LogTime yes
Foreground no
Debug no
MaxAttempts 5
DatabaseDirectory /var/lib/clamav
DatabaseOwner clamscan
DatabaseMirror db.local.clamav.net
DatabaseMirror database.clamav.net
DNSDatabaseInfo current.cvd.clamav.net
ConnectTimeout 30
ReceiveTimeout 0
TestDatabases yes
ScriptedUpdates yes
CompressLocalDatabase no
Bytecode yes
NotifyClamd /etc/clamd.d/scan.conf
Checks 24
DatabaseCustomURL https://secure.eicar.org/eicar.com.txt
EOF

# Create systemd service for clamd
cat > /etc/systemd/system/clamd@scan.service << 'EOF'
[Unit]
Description=clamd scanner (%i) daemon
Documentation=man:clamd(8) man:clamd.conf(5) https://www.clamav.net/documents/
After=network.target

[Service]
Type=forking
ExecStart=/usr/bin/clamd -c /etc/clamd.d/%i.conf
Restart=on-failure
RestartSec=5s
StandardOutput=journal

[Install]
WantedBy=multi-user.target
EOF

# Create systemd service for freshclam
cat > /etc/systemd/system/clamav-freshclam.service << 'EOF'
[Unit]
Description=ClamAV virus database updater
Documentation=man:freshclam(1) man:freshclam.conf(5) https://www.clamav.net/documents/
After=network.target

[Service]
ExecStart=/usr/bin/freshclam -d --foreground=true
Restart=on-failure
RestartSec=5s
User=clamscan
StandardOutput=journal

[Install]
WantedBy=multi-user.target
EOF

# Fix ownership
chown -R clamscan:clamscan /var/lib/clamav
chown -R clamscan:clamscan /var/log/

# Start and enable services
systemctl daemon-reload
systemctl enable clamd@scan
systemctl enable clamav-freshclam
systemctl start clamav-freshclam
systemctl start clamd@scan

# Signal CloudFormation that instance is ready
yum install -y aws-cfn-bootstrap
/opt/aws/bin/cfn-signal -e $? --stack ${AWS::StackName} --resource ClamavInstance --region ${AWS::Region}