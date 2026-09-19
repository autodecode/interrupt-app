package com.interrupt.app.protection;

public final class VpnConfiguration {

    /*
     * TUN interface addresses.
     *
     * These addresses exist only inside the VPN interface.
     * They must not collide with the physical network.
     */
    public static final String IPV4_ADDRESS =
            "10.111.0.2";

    public static final int IPV4_PREFIX_LENGTH =
            32;


    public static final String IPV6_ADDRESS =
            "fd00:1:1:1::2";

    public static final int IPV6_PREFIX_LENGTH =
            128;


    /*
     * Routes installed into the VPN.
     *
     * Full-tunnel routing is intentional: Protection must
     * see traffic before it can reach the network.
     */
    public static final String IPV4_ROUTE =
            "0.0.0.0";

    public static final int IPV4_ROUTE_PREFIX_LENGTH =
            0;


    public static final String IPV6_ROUTE =
            "::";

    public static final int IPV6_ROUTE_PREFIX_LENGTH =
            0;


    /*
     * DNS endpoint exposed inside the VPN.
     *
     * HEV MapDNS listens on this IPv4 address and port.
     * We intentionally expose only the IPv4 MapDNS endpoint
     * here because there is no IPv6 MapDNS listener in the
     * current HEV configuration.
     */
    public static final String IPV4_DNS =
            "10.111.0.1";


    /*
     * No IPV6_DNS is advertised.
     *
     * Advertising an IPv6 DNS address without an actual
     * resolver listening there would create a broken DNS path
     * for applications choosing IPv6 DNS.
     */


    /*
     * Upstream DNS resolver.
     *
     * This value is retained for the native DNS forwarding
     * layer. HEV MapDNS itself is responsible for hostname
     * mapping in the current tunnel architecture.
     */
    public static final String UPSTREAM_DNS =
            "1.1.1.1";

    public static final int UPSTREAM_DNS_PORT =
            53;


    /*
     * VPN MTU.
     *
     * A conservative value leaves room for encapsulation
     * and avoids unnecessarily large packets.
     */
    public static final int MTU =
            1500;


    /*
     * Packet buffer used by the TUN reader/writer.
     */
    public static final int PACKET_BUFFER_SIZE =
            32767;


    /*
     * DNS timeout used by the native forwarding layer.
     */
    public static final int DNS_TIMEOUT_MS =
            3000;


    private VpnConfiguration() {
    }
}
