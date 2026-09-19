package com.interrupt.app.protection;

import android.content.Context;
import android.net.VpnService;
import android.os.ParcelFileDescriptor;

import hev.htproxy.TProxyService;

public final class HevTunnelController {

    private final Context context;
    private final VpnService vpnService;

    private ParcelFileDescriptor vpnInterface;
    private LocalSocks5Server socks5Server;

    private boolean running;


    public HevTunnelController(
            VpnService vpnService
    ) {

        if (vpnService == null) {
            throw new IllegalArgumentException(
                    "VpnService cannot be null"
            );
        }

        this.vpnService =
                vpnService;

        this.context =
                vpnService
                        .getApplicationContext();
    }


    public synchronized boolean start(
            ParcelFileDescriptor vpnInterface
    ) {

        if (running) {
            return true;
        }

        if (vpnInterface == null) {
            return false;
        }

        try {

            String tunnelConfig =
                    HevConfiguration.prepare(
                            context
                    );

            ProtectionController protectionController =
                    ProtectionController.getInstance(
                            context
                    );

            socks5Server =
                    new LocalSocks5Server(
                            vpnService,
                            protectionController
                    );

            if (!socks5Server.start()) {
                socks5Server = null;
                return false;
            }

            int tunFd =
                    vpnInterface.getFd();

            if (
                    !TProxyService.TProxyStartService(
                            tunnelConfig,
                            tunFd
                    )
            ) {

                socks5Server.stop();
                socks5Server = null;

                return false;
            }

            this.vpnInterface =
                    vpnInterface;

            running = true;

            return true;

        } catch (Exception error) {

            stop();

            return false;
        }
    }


    public synchronized void stop() {

        if (
                TProxyService.TProxyIsRunning()
        ) {

            TProxyService.TProxyStopService();
        }

        if (socks5Server != null) {

            socks5Server.stop();
            socks5Server = null;
        }

        vpnInterface = null;
        running = false;
    }


    public synchronized boolean isRunning() {

        return running
                &&
                TProxyService.TProxyIsRunning()
                &&
                socks5Server != null
                &&
                socks5Server.isRunning();
    }
}
