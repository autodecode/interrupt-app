HEV native dependencies for INTERRUPT Protection

Required components:

1. hev-socks5-tunnel
2. hev-socks5-server

Android ABIs:

- arm64-v8a
- armeabi-v7a
- x86
- x86_64

The native libraries are loaded by:

hev.htproxy.TProxyService
hev.socks5.Socks5Service

Expected libraries:

libhev-socks5-tunnel.so
libhev-socks5-server.so

The Android build must place them under:

android/app/src/main/jniLibs/<ABI>/

Do not commit generated .so files.
They are produced during the Android build.
