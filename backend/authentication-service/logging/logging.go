// Package logging menyeragamkan format log ticketing-app untuk service Go.
// Skema field mengikuti docs/LOGGING-STANDARD.md dan identik dengan service
// Java (logback) serta api-gateway (pino), supaya bisa diproses seragam di
// BindPlane / Dynatrace. File ini sengaja disalin apa adanya ke setiap service
// Go (tiap service adalah module terpisah).
package logging

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// Nilai field log.type.
const (
	TypeAccess   = "access"   // satu baris per HTTP request
	TypeApp      = "app"      // lifecycle / teknis (startup, koneksi DB, retry)
	TypeBusiness = "business" // event domain (booking dibuat, pembayaran sukses, ...)
	TypeSecurity = "security" // login, register, token, otorisasi ditolak
	TypeAudit    = "audit"    // perubahan data master oleh admin
)

const (
	headerRequestID   = "X-Request-ID"
	headerTraceparent = "traceparent"
	ginLoggerKey      = "logger"
)

// Init memasang logger JSON sebagai slog default. Karena slog.SetDefault juga
// mengarahkan package "log" standar, log.Printf lama ikut keluar sebagai JSON
// dengan skema yang sama.
func Init(serviceName string) {
	level := slog.LevelInfo
	switch strings.ToLower(os.Getenv("LOG_LEVEL")) {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	}

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level:       level,
		ReplaceAttr: renameStandardKeys,
	})

	slog.SetDefault(slog.New(&defaultTypeHandler{Handler: handler}).With(
		slog.String("service.name", serviceName),
		slog.String("service.version", getenv("SERVICE_VERSION", "unknown")),
		slog.String("deployment.environment", getenv("DEPLOYMENT_ENV", "dev")),
	))
	gin.SetMode(getenv("GIN_MODE", gin.ReleaseMode))
}

// defaultTypeHandler menambahkan log.type=app bila record belum punya log.type,
// tanpa membuat key ganda (slog tidak men-dedup key).
type defaultTypeHandler struct {
	slog.Handler
	hasType bool
}

func (h *defaultTypeHandler) Handle(ctx context.Context, r slog.Record) error {
	// log.Printf lama selalu masuk sebagai INFO; naikkan level berdasarkan
	// prefix pesan ("ERROR: ...", "Warning: ...") supaya filter level konsisten.
	if r.Level == slog.LevelInfo {
		msg := strings.ToUpper(r.Message)
		switch {
		case strings.HasPrefix(msg, "ERROR") || strings.HasPrefix(msg, "FATAL"):
			r.Level = slog.LevelError
		case strings.HasPrefix(msg, "WARN"):
			r.Level = slog.LevelWarn
		}
	}
	if !h.hasType {
		found := false
		r.Attrs(func(a slog.Attr) bool {
			found = a.Key == "log.type"
			return !found
		})
		if !found {
			r.AddAttrs(slog.String("log.type", TypeApp))
		}
	}
	return h.Handler.Handle(ctx, r)
}

func (h *defaultTypeHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	has := h.hasType
	for _, a := range attrs {
		if a.Key == "log.type" {
			has = true
		}
	}
	return &defaultTypeHandler{Handler: h.Handler.WithAttrs(attrs), hasType: has}
}

func (h *defaultTypeHandler) WithGroup(name string) slog.Handler {
	return &defaultTypeHandler{Handler: h.Handler.WithGroup(name), hasType: h.hasType}
}

// renameStandardKeys: time -> timestamp (UTC), msg -> message.
func renameStandardKeys(groups []string, a slog.Attr) slog.Attr {
	if len(groups) > 0 {
		return a
	}
	switch a.Key {
	case slog.TimeKey:
		return slog.String("timestamp", a.Value.Time().UTC().Format(time.RFC3339Nano))
	case slog.MessageKey:
		a.Key = "message"
	}
	return a
}

// Middleware menggantikan logger bawaan Gin: menulis satu access log JSON per
// request dan menyimpan logger ber-konteks (request_id, trace_id) di gin.Context.
// Health probe hanya dicatat di level DEBUG agar tidak membanjiri pipeline.
func Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		requestID := c.GetHeader(headerRequestID)
		if requestID == "" {
			requestID = randomHex(16)
		}
		c.Header(headerRequestID, requestID)

		attrs := []any{slog.String("request_id", requestID)}
		if traceID, spanID, ok := parseTraceparent(c.GetHeader(headerTraceparent)); ok {
			attrs = append(attrs, slog.String("trace_id", traceID), slog.String("parent_span_id", spanID))
		}
		reqLogger := slog.Default().With(attrs...)
		c.Set(ginLoggerKey, reqLogger)

		c.Next()

		status := c.Writer.Status()
		path := c.Request.URL.Path
		level := slog.LevelInfo
		switch {
		case status >= 500:
			level = slog.LevelError
		case status >= 400:
			level = slog.LevelWarn
		case isProbe(path):
			level = slog.LevelDebug
		}

		fields := []slog.Attr{
			slog.String("log.type", TypeAccess),
			slog.String("http.request.method", c.Request.Method),
			slog.String("url.path", path),
			slog.String("http.route", c.FullPath()),
			slog.Int("http.response.status_code", status),
			slog.Int("http.response.body.size", c.Writer.Size()),
			slog.Float64("duration_ms", float64(time.Since(start).Microseconds())/1000),
			slog.String("client.address", c.ClientIP()),
			slog.String("user_agent.original", c.Request.UserAgent()),
		}
		if userID := UserID(c); userID != "" {
			fields = append(fields, slog.String("user.id", userID))
		}
		if len(c.Errors) > 0 {
			fields = append(fields, slog.String("error.message", c.Errors.String()))
		}
		reqLogger.LogAttrs(c.Request.Context(), level, "http request", fields...)
	}
}

// Audit mencatat satu event audit untuk setiap mutasi (POST/PUT/DELETE) yang
// berhasil di route group, mis. event.name "catalog.rooms.updated".
func Audit(domain string) gin.HandlerFunc {
	actions := map[string]string{"POST": "created", "PUT": "updated", "PATCH": "updated", "DELETE": "deleted"}
	return func(c *gin.Context) {
		c.Next()
		action, ok := actions[c.Request.Method]
		if !ok || c.Writer.Status() >= 400 {
			return
		}
		resource := ""
		for _, seg := range strings.Split(c.FullPath(), "/") {
			if seg != "" && !strings.HasPrefix(seg, ":") && seg != "admin" {
				resource = seg
			}
		}
		attrs := []slog.Attr{
			slog.String("audit.resource", resource),
			slog.String("audit.action", action),
			slog.String("http.route", c.FullPath()),
		}
		if id := c.Param("id"); id != "" {
			attrs = append(attrs, slog.String("audit.resource_id", id))
		}
		if userID := UserID(c); userID != "" {
			attrs = append(attrs, slog.String("user.id", userID))
		}
		Event(c.Request.Context(), From(c), slog.LevelInfo, TypeAudit,
			domain+"."+resource+"."+action, "admin "+action+" "+resource, attrs...)
	}
}

// Nilai DUMMY untuk demo masking/redaction di BindPlane. Bukan data user asli:
// konstanta palsu (kartu 4111... adalah nomor kartu tes standar) yang hanya
// ditambahkan bila LOG_DEMO_SENSITIVE=true.
var demoSensitive = map[string][]slog.Attr{
	"auth": {
		slog.String("user.email", "dummy.user@example.com"),
		slog.String("auth.password", "Dummy#Passw0rd!"),
		slog.String("auth.access_token", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkdW1teSJ9.ZHVtbXktc2lnbmF0dXJl"),
	},
	"payment": {
		slog.String("payment.card.number", "4111111111111111"),
		slog.String("payment.card.cvv", "123"),
		slog.String("payment.card.expiry", "12/30"),
		slog.String("payment.card.holder", "DUMMY CARDHOLDER"),
	},
}

// DemoSensitive mengembalikan field credential dummy untuk kategori "auth" atau
// "payment" (ditandai sensitive.dummy=true), atau nil bila flag tidak aktif.
func DemoSensitive(kind string) []slog.Attr {
	if !strings.EqualFold(os.Getenv("LOG_DEMO_SENSITIVE"), "true") {
		return nil
	}
	attrs, ok := demoSensitive[kind]
	if !ok {
		return nil
	}
	return append([]slog.Attr{slog.Bool("sensitive.dummy", true)}, attrs...)
}

// From mengembalikan logger request saat ini (fallback ke slog.Default).
func From(c *gin.Context) *slog.Logger {
	if c != nil {
		if v, ok := c.Get(ginLoggerKey); ok {
			if l, ok := v.(*slog.Logger); ok {
				return l
			}
		}
	}
	return slog.Default()
}

// Event menulis event bisnis/keamanan dengan field event.name dan log.type.
func Event(ctx context.Context, logger *slog.Logger, level slog.Level, logType, eventName, message string, attrs ...slog.Attr) {
	all := append([]slog.Attr{
		slog.String("log.type", logType),
		slog.String("event.name", eventName),
	}, attrs...)
	logger.LogAttrs(ctx, level, message, all...)
}

// Business mencatat event domain level INFO untuk request Gin saat ini.
func Business(c *gin.Context, eventName, message string, attrs ...slog.Attr) {
	Event(c.Request.Context(), From(c), slog.LevelInfo, TypeBusiness, eventName, message, attrs...)
}

// Security mencatat event autentikasi/otorisasi untuk request Gin saat ini.
func Security(c *gin.Context, level slog.Level, eventName, message string, attrs ...slog.Attr) {
	Event(c.Request.Context(), From(c), level, TypeSecurity, eventName, message, attrs...)
}

// UserID membaca user_id yang dipasang middleware auth (string atau fmt.Stringer).
func UserID(c *gin.Context) string {
	v, ok := c.Get("user_id")
	if !ok || v == nil {
		return ""
	}
	switch id := v.(type) {
	case string:
		return id
	case interface{ String() string }:
		return id.String()
	}
	return ""
}

// RequestHeaders mengembalikan header korelasi untuk diteruskan ke service lain.
func RequestHeaders(c *gin.Context) map[string]string {
	h := map[string]string{}
	if c == nil {
		return h
	}
	if v := c.Writer.Header().Get(headerRequestID); v != "" {
		h[headerRequestID] = v
	}
	return h
}

func isProbe(path string) bool {
	return path == "/health" || strings.HasPrefix(path, "/health/") || strings.HasSuffix(path, "/health")
}

// parseTraceparent membaca header W3C "00-<trace-id>-<parent-id>-<flags>".
func parseTraceparent(v string) (traceID, spanID string, ok bool) {
	parts := strings.Split(strings.TrimSpace(v), "-")
	if len(parts) != 4 || len(parts[1]) != 32 || len(parts[2]) != 16 {
		return "", "", false
	}
	if parts[1] == strings.Repeat("0", 32) {
		return "", "", false
	}
	return parts[1], parts[2], true
}

func randomHex(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return ""
	}
	return hex.EncodeToString(b)
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
