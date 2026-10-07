package com.train_service.logging;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.MDC;
import org.slf4j.event.Level;

import static net.logstash.logback.argument.StructuredArguments.entries;

/**
 * Helper untuk event bisnis / keamanan / audit dengan skema log standar
 * ticketing-app (docs/LOGGING-STANDARD.md). Field event ditulis sebagai field
 * JSON top-level, sama seperti service Go dan api-gateway.
 */
public final class LogEvents {

    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_BUSINESS = "business";
    public static final String TYPE_SECURITY = "security";
    public static final String TYPE_AUDIT = "audit";

    private LogEvents() {
    }

    /** Builder kecil agar pemanggil bisa menulis fields("booking.id", id, "amount", 10). */
    public static Map<String, Object> fields(Object... keyValues) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            Object value = keyValues[i + 1];
            if (value != null) {
                map.put(String.valueOf(keyValues[i]), value instanceof Enum<?> e ? e.name() : value);
            }
        }
        return map;
    }

    /**
     * Field credential DUMMY untuk demo masking di BindPlane (nilai palsu, bukan
     * data user). Kosong kecuali env LOG_DEMO_SENSITIVE=true.
     */
    public static Map<String, Object> demoSensitive(String kind) {
        if (!"true".equalsIgnoreCase(System.getenv("LOG_DEMO_SENSITIVE"))) {
            return Map.of();
        }
        return switch (kind) {
            case "auth" -> fields("sensitive.dummy", true,
                    "user.email", "dummy.user@example.com",
                    "auth.password", "Dummy#Passw0rd!",
                    "auth.access_token", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkdW1teSJ9.ZHVtbXktc2lnbmF0dXJl");
            case "payment" -> fields("sensitive.dummy", true,
                    "payment.card.number", "4111111111111111",
                    "payment.card.cvv", "123",
                    "payment.card.expiry", "12/30",
                    "payment.card.holder", "DUMMY CARDHOLDER");
            default -> Map.of();
        };
    }

    public static void business(Logger log, String eventName, String message, Map<String, ?> fields) {
        emit(log, Level.INFO, TYPE_BUSINESS, eventName, message, fields);
    }

    public static void security(Logger log, Level level, String eventName, String message, Map<String, ?> fields) {
        emit(log, level, TYPE_SECURITY, eventName, message, fields);
    }

    public static void emit(Logger log, Level level, String logType, String eventName, String message,
                            Map<String, ?> fields) {
        try (MDC.MDCCloseable t = MDC.putCloseable("log.type", logType);
             MDC.MDCCloseable e = eventName == null ? null : MDC.putCloseable("event.name", eventName)) {
            Object args = entries(fields == null ? Map.of() : fields);
            switch (level) {
                case ERROR -> log.error(message, args);
                case WARN -> log.warn(message, args);
                case DEBUG -> log.debug(message, args);
                case TRACE -> log.trace(message, args);
                default -> log.info(message, args);
            }
        }
    }
}
