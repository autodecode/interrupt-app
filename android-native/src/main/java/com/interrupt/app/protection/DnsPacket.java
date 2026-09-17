package com.interrupt.app.protection;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

public final class DnsPacket {

    private DnsPacket() {
    }

    public static final int DNS_HEADER_SIZE = 12;
    public static final int TYPE_A = 1;
    public static final int TYPE_AAAA = 28;
    public static final int CLASS_IN = 1;

    public static final class Query {

        public final int transactionId;
        public final int flags;
        public final String hostname;
        public final int questionType;
        public final int questionClass;

        private Query(
                int transactionId,
                int flags,
                String hostname,
                int questionType,
                int questionClass
        ) {
            this.transactionId = transactionId;
            this.flags = flags;
            this.hostname = hostname;
            this.questionType = questionType;
            this.questionClass = questionClass;
        }
    }

    public static Query parseQuery(byte[] packet, int length) {

        if (
                packet == null ||
                length < DNS_HEADER_SIZE ||
                length > packet.length
        ) {
            return null;
        }

        ByteBuffer buffer =
                ByteBuffer.wrap(packet, 0, length)
                        .order(ByteOrder.BIG_ENDIAN);

        int transactionId =
                Short.toUnsignedInt(buffer.getShort());

        int flags =
                Short.toUnsignedInt(buffer.getShort());

        int questionCount =
                Short.toUnsignedInt(buffer.getShort());

        int answerCount =
                Short.toUnsignedInt(buffer.getShort());

        int authorityCount =
                Short.toUnsignedInt(buffer.getShort());

        int additionalCount =
                Short.toUnsignedInt(buffer.getShort());

        if (
                questionCount < 1 ||
                answerCount != 0
        ) {
            return null;
        }

        String hostname =
                readHostname(
                        packet,
                        buffer.position(),
                        length
                );

        if (hostname == null) {
            return null;
        }

        int nameLength =
                encodedHostnameLength(
                        packet,
                        buffer.position(),
                        length
                );

        if (nameLength <= 0) {
            return null;
        }

        int questionOffset =
                buffer.position() + nameLength;

        if (questionOffset + 4 > length) {
            return null;
        }

        int questionType =
                unsignedShort(
                        packet,
                        questionOffset
                );

        int questionClass =
                unsignedShort(
                        packet,
                        questionOffset + 2
                );

        return new Query(
                transactionId,
                flags,
                hostname,
                questionType,
                questionClass
        );
    }

    public static byte[] buildNxDomainResponse(
            byte[] request,
            int length
    ) {

        Query query =
                parseQuery(request, length);

        if (query == null) {
            return null;
        }

        int questionLength =
                findQuestionEnd(
                        request,
                        length
                );

        if (questionLength < 0) {
            return null;
        }

        ByteArrayOutputStream output =
                new ByteArrayOutputStream();

        writeShort(
                output,
                query.transactionId
        );

        /*
         * QR = response
         * OPCODE copied from request
         * AA = authoritative
         * RCODE = NXDOMAIN (3)
         *
         * We deliberately do not copy RD into
         * the response flags because this is a
         * locally generated blocking response.
         */
        int responseFlags =
                0x8000
                        |
                0x0400
                        |
                0x0003;

        writeShort(
                output,
                responseFlags
        );

        writeShort(
                output,
                1
        );

        writeShort(
                output,
                0
        );

        writeShort(
                output,
                0
        );

        writeShort(
                output,
                0
        );

        output.write(
                request,
                DNS_HEADER_SIZE,
                questionLength - DNS_HEADER_SIZE
        );

        return output.toByteArray();
    }

    public static boolean isDnsQuery(
            byte[] packet,
            int length
    ) {

        Query query =
                parseQuery(packet, length);

        return query != null
                &&
                query.questionClass == CLASS_IN
                &&
                (
                        query.questionType == TYPE_A
                        ||
                        query.questionType == TYPE_AAAA
                );
    }

    private static String readHostname(
            byte[] packet,
            int offset,
            int length
    ) {

        StringBuilder hostname =
                new StringBuilder();

        int position = offset;
        int labels = 0;

        while (position < length) {

            int labelLength =
                    packet[position] & 0xFF;

            position++;

            if (labelLength == 0) {
                break;
            }

            /*
             * DNS name compression is not valid in
             * the question section we generate/expect.
             */
            if ((labelLength & 0xC0) != 0) {
                return null;
            }

            if (
                    labelLength > 63 ||
                    position + labelLength > length
            ) {
                return null;
            }

            if (labels++ > 127) {
                return null;
            }

            if (hostname.length() > 0) {
                hostname.append('.');
            }

            for (
                    int i = 0;
                    i < labelLength;
                    i++
            ) {

                int value =
                        packet[position + i] & 0xFF;

                if (
                        value < 0x21 ||
                        value > 0x7E
                ) {
                    return null;
                }

                hostname.append(
                        (char) value
                );
            }

            position += labelLength;
        }

        if (hostname.length() == 0) {
            return null;
        }

        return hostname.toString();
    }

    private static int encodedHostnameLength(
            byte[] packet,
            int offset,
            int length
    ) {

        int position = offset;

        while (position < length) {

            int labelLength =
                    packet[position] & 0xFF;

            position++;

            if (labelLength == 0) {
                return position - offset;
            }

            if ((labelLength & 0xC0) != 0) {
                return -1;
            }

            if (
                    labelLength > 63 ||
                    position + labelLength > length
            ) {
                return -1;
            }

            position += labelLength;
        }

        return -1;
    }

    private static int findQuestionEnd(
            byte[] packet,
            int length
    ) {

        int nameLength =
                encodedHostnameLength(
                        packet,
                        DNS_HEADER_SIZE,
                        length
                );

        if (nameLength < 0) {
            return -1;
        }

        int end =
                DNS_HEADER_SIZE
                        +
                nameLength
                        +
                4;

        if (end > length) {
            return -1;
        }

        return end;
    }

    private static int unsignedShort(
            byte[] packet,
            int offset
    ) {

        return (
                ((packet[offset] & 0xFF) << 8)
                |
                (packet[offset + 1] & 0xFF)
        );
    }

    private static void writeShort(
            ByteArrayOutputStream output,
            int value
    ) {

        output.write(
                (value >>> 8) & 0xFF
        );

        output.write(
                value & 0xFF
        );
    }
}
