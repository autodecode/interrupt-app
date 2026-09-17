package com.interrupt.app.protection;

import android.content.Context;
import android.net.VpnService;
import android.os.ParcelFileDescriptor;

import hev.htproxy.TProxyService;
import hev.socks5.Socks5Service;

import java.io.IOException;

public final class HevTunnelController {

    private final Context context;

    private ParcelFileDescriptor vpnInterface;

    private boolean running;

    public HevTunnelController(
            Context context
    ) {

        if (context == null) {
            throw new IllegalArgumentException(
                    "Context cannot be null"
            );
        }

        this.context =
                context.getApplicationContext();
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

            String socks5Config =
                    context.getFilesDir()
                            .toPath()
                            .resolve("hev")
                            .resolve("socks5.yml")
                            .toString();

            if (
                    !Socks5Service.Socks5StartService(
                            socks5Config
                    )
            ) {
                return false;
            }

            int tunFd =
                    vpnInterface
                            .getFd();

            if (
                    !TProxyService.TProxyStartService(
                            tunnelConfig,
                            tunFd
                    )
            ) {

                Socks5Service
                        .Socks5StopService();

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
            TProxyService
                    .TProxyStopService();
        }

        if (
                Socks5Service.Socks5IsRunning()
        ) {
            Socks5Service
                    .Socks5StopService();
        }

        vpnInterface = null;
        running = false;
    }

    public synchronized boolean isRunning() {

        return running
                &&
                TProxyService.TProxyIsRunning()
                &&
                Socks5Service.Socks5IsRunning();
    }
}
