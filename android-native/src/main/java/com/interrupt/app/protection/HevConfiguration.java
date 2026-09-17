package com.interrupt.app.protection;

import android.content.Context;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

public final class HevConfiguration {

    private static final String TUNNEL_ASSET =
            "hev/tunnel.yml";

    private static final String SOCKS5_ASSET =
            "hev/socks5.yml";

    private static final String DIRECTORY =
            "hev";

    private HevConfiguration() {
    }

    public static String prepare(
            Context context
    ) throws IOException {

        if (context == null) {
            throw new IllegalArgumentException(
                    "Context cannot be null"
            );
        }

        File directory =
                new File(
                        context.getFilesDir(),
                        DIRECTORY
                );

        if (
                !directory.exists()
                &&
                !directory.mkdirs()
        ) {
            throw new IOException(
                    "Unable to create HEV directory"
            );
        }

        File tunnelFile =
                new File(
                        directory,
                        "tunnel.yml"
                );

        File socks5File =
                new File(
                        directory,
                        "socks5.yml"
                );

        copyAsset(
                context,
                TUNNEL_ASSET,
                tunnelFile
        );

        copyAsset(
                context,
                SOCKS5_ASSET,
                socks5File
        );

        return tunnelFile.getAbsolutePath();
    }

    private static void copyAsset(
            Context context,
            String assetPath,
            File destination
    ) throws IOException {

        try (
                InputStream input =
                        context.getAssets()
                                .open(assetPath);

                FileOutputStream output =
                        new FileOutputStream(
                                destination
                        )
        ) {

            byte[] buffer =
                    new byte[8192];

            int length;

            while (
                    (length = input.read(buffer))
                            != -1
            ) {

                output.write(
                        buffer,
                        0,
                        length
                );
            }

            output.flush();
        }
    }
}
