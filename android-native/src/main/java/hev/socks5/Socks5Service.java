package hev.socks5;

public final class Socks5Service {

    static {
        System.loadLibrary("hev-socks5-server");
    }

    private Socks5Service() {
    }

    public static native boolean Socks5StartService(
            String configPath
    );

    public static native boolean Socks5StopService();

    public static native boolean Socks5IsRunning();
}
