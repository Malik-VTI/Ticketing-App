package com.train_service.logging;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.slf4j.event.Level;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;

/**
 * Access log JSON + konteks korelasi (request_id, trace_id, user.id) di MDC,
 * plus event audit otomatis untuk mutasi sukses di route /admin/**.
 * Skema identik dengan middleware logging service Go (docs/LOGGING-STANDARD.md).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {

    static final String HEADER_REQUEST_ID = "X-Request-ID";
    private static final Logger ACCESS = LoggerFactory.getLogger("http.access");
    private static final Logger AUDIT = LoggerFactory.getLogger("audit");
    private static final Map<String, String> AUDIT_ACTIONS =
            Map.of("POST", "created", "PUT", "updated", "PATCH", "updated", "DELETE", "deleted");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long start = System.nanoTime();

        String requestId = request.getHeader(HEADER_REQUEST_ID);
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString().replace("-", "");
        }
        response.setHeader(HEADER_REQUEST_ID, requestId);
        MDC.put("request_id", requestId);

        String[] trace = parseTraceparent(request.getHeader("traceparent"));
        if (trace != null) {
            MDC.put("trace_id", trace[0]);
            MDC.put("parent_span_id", trace[1]);
        }
        String userId = request.getHeader("X-User-Id");
        if (userId != null && !userId.isBlank()) {
            MDC.put("user.id", userId);
        }

        try {
            chain.doFilter(request, response);
        } finally {
            try {
                writeAccessLog(request, response, start);
                writeAuditLog(request, response);
            } finally {
                MDC.remove("request_id");
                MDC.remove("trace_id");
                MDC.remove("parent_span_id");
                MDC.remove("user.id");
            }
        }
    }

    private void writeAccessLog(HttpServletRequest request, HttpServletResponse response, long start) {
        int status = response.getStatus();
        String path = request.getRequestURI();
        Level level = status >= 500 ? Level.ERROR
                : status >= 400 ? Level.WARN
                : isProbe(path) ? Level.DEBUG
                : Level.INFO;
        String userAgent = request.getHeader("User-Agent");
        LogEvents.emit(ACCESS, level, LogEvents.TYPE_ACCESS, null, "http request", LogEvents.fields(
                "http.request.method", request.getMethod(),
                "url.path", path,
                "http.route", route(request),
                "http.response.status_code", status,
                "duration_ms", (System.nanoTime() - start) / 1_000_000.0,
                "client.address", clientAddress(request),
                "user_agent.original", userAgent == null ? "" : userAgent));
    }

    private void writeAuditLog(HttpServletRequest request, HttpServletResponse response) {
        String action = AUDIT_ACTIONS.get(request.getMethod());
        String route = route(request);
        if (action == null || response.getStatus() >= 400 || !route.contains("/admin/")) {
            return;
        }
        String resource = "";
        for (String seg : route.split("/")) {
            if (!seg.isEmpty() && !seg.startsWith("{") && !seg.equals("admin")) {
                resource = seg;
            }
        }
        Object vars = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        Object resourceId = vars instanceof Map<?, ?> m ? m.get("id") : null;
        LogEvents.emit(AUDIT, Level.INFO, LogEvents.TYPE_AUDIT, "catalog." + resource + "." + action,
                "admin " + action + " " + resource, LogEvents.fields(
                        "audit.resource", resource,
                        "audit.action", action,
                        "audit.resource_id", resourceId,
                        "http.route", route));
    }

    private static String route(HttpServletRequest request) {
        Object pattern = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        return pattern == null ? "" : pattern.toString();
    }

    private static String clientAddress(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    static boolean isProbe(String path) {
        return path.endsWith("/health") || path.contains("/health/") || path.startsWith("/actuator");
    }

    /** W3C traceparent "00-<trace-id>-<parent-id>-<flags>" → {traceId, parentSpanId}. */
    static String[] parseTraceparent(String value) {
        if (value == null) {
            return null;
        }
        String[] parts = value.trim().split("-");
        if (parts.length != 4 || parts[1].length() != 32 || parts[2].length() != 16
                || parts[1].chars().allMatch(c -> c == '0')) {
            return null;
        }
        return new String[] {parts[1], parts[2]};
    }
}
