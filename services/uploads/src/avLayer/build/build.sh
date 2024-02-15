#!/usr/bin/env bash
set -e

echo "building clamav lambda layer..."
uname -m
rm -rf bin
rm -rf lib
rm lambda_layer.zip || true

dnf update -y
dnf install -y cpio yum-utils zip

# extract binaries for clamav
mkdir -p /tmp/build
pushd /tmp/build

# Install latest clamav from clamav.net
curl -L --output clamav-1.0.4.linux.x86_64.rpm https://www.clamav.net/downloads/production/clamav-1.0.4.linux.x86_64.rpm
rpm2cpio clamav-*.rpm | cpio -vimd

# Download other package dependencies
dnf download -x \*i686 --archlist=x86_64 json-c pcre2 libtool-ltdl libxml2 bzip2-libs xz-libs gnutls nettle libcurl libnghttp2 libidn2 libssh2 openldap libffi krb5-libs keyutils-libs libunistring cyrus-sasl-lib nss nspr libselinux openssl-libs 
rpm2cpio json-c*.rpm | cpio -vimd
rpm2cpio pcre*.rpm | cpio -vimd
rpm2cpio libtool-ltdl*.rpm | cpio -vimd
rpm2cpio libxml2*.rpm | cpio -vimd
rpm2cpio bzip2-libs*.rpm | cpio -vimd
rpm2cpio xz-libs*.rpm | cpio -vimd
rpm2cpio gnutls*.rpm | cpio -vimd
rpm2cpio nettle*.rpm | cpio -vimd
rpm2cpio libcurl*.rpm | cpio -vimd
rpm2cpio libnghttp2*.rpm | cpio -vimd
rpm2cpio libidn2*.rpm | cpio -vimd
rpm2cpio libssh2*.rpm | cpio -vimd
rpm2cpio openldap*.rpm | cpio -vimd
rpm2cpio libffi*.rpm | cpio -vimd
rpm2cpio krb5-libs*.rpm | cpio -vimd
rpm2cpio keyutils-libs*.rpm | cpio -vimd
rpm2cpio libunistring*.rpm | cpio -vimd
rpm2cpio cyrus-sasl-lib*.rpm | cpio -vimd
rpm2cpio nss*.rpm | cpio -vimd
rpm2cpio nspr*.rpm | cpio -vimd
rpm2cpio libselinux*.rpm | cpio -vimd
rpm2cpio openssl-libs*.rpm | cpio -vimd

popd

mkdir -p bin lib

cp /tmp/build/usr/local/bin/clamscan /tmp/build/usr/local/bin/clamdscan /tmp/build/usr/local/bin/freshclam bin/.
cp -R /tmp/build/usr/lib64/* lib/.
cp -R /tmp/build/usr/local/lib64/* lib/.
cp freshclam.conf bin/freshclam.conf
cp clamd-main.conf bin/clamd-main.conf
cp clamd-val.conf bin/clamd-val.conf
cp clamd-prod.conf bin/clamd-prod.conf

zip -r9 lambda_layer.zip bin
zip -r9 lambda_layer.zip lib