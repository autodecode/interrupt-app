# INTERRUPT native networking

This directory contains the native networking dependencies
used by INTERRUPT Android Protection.

## Components

### hev-socks5-tunnel

Version:

2.17.1

Official repository:

https://github.com/heiher/hev-socks5-tunnel

Used for:

- TUN to SOCKS5 forwarding
- IPv4
- IPv6
- TCP
- UDP

The Android release provides native binaries/AAR for:

- armeabi-v7a
- arm64-v8a
- x86
- x86_64

### hev-socks5-server

Official repository:

https://github.com/heiher/hev-socks5-server

Used as the local SOCKS5 endpoint for the tunnel.

## JNI contracts

hev-socks5-tunnel:

package:
hev.htproxy

class:
TProxyService

native library:
hev-socks5-tunnel

Methods:

TProxyStartService(String configPath, int fd)
TProxyStopService()
TProxyIsRunning()
TProxyGetStats()


hev-socks5-server:

package:
hev.socks5.server

class:
Socks5Server

native library:
hev-socks5-server

Methods:

StartService(String configPath)
StopService()
IsRunning()

## Integration rule

Do not modify the upstream native libraries.

The Android application owns:

- configuration files
- lifecycle
- VpnService
- socket protection
- Protection decisions
- blocked-domain events

The upstream libraries own:

- TCP forwarding
- UDP forwarding
- SOCKS5 protocol
- TUN packet transport
