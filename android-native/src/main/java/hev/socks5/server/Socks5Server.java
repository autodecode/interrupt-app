package hev.socks5.server;

public final class Socks5Server {

    static {
        System.loadLibrary("hev-socks5-server");
    }

    private Socks5Server() {
    }

    public static native boolean StartService(
            String configPath
    );

    public static native boolean StopService();

    public static native boolean IsRunning();
}
