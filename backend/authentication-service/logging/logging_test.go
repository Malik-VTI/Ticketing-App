package logging

import (
	"bytes"
	"encoding/json"
	"log"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

// captureLogs mengarahkan logger default ke buffer selama test.
func captureLogs(t *testing.T, level slog.Level) *bytes.Buffer {
	t.Helper()
	prev := slog.Default()
	buf := &bytes.Buffer{}
	h := slog.NewJSONHandler(buf, &slog.HandlerOptions{Level: level, ReplaceAttr: renameStandardKeys})
	slog.SetDefault(slog.New(&defaultTypeHandler{Handler: h}).With(slog.String("service.name", "test-service")))
	t.Cleanup(func() { slog.SetDefault(prev) })
	return buf
}

func decodeLines(t *testing.T, buf *bytes.Buffer) []map[string]any {
	t.Helper()
	var out []map[string]any
	for _, line := range strings.Split(strings.TrimSpace(buf.String()), "\n") {
		if line == "" {
			continue
		}
		if strings.Count(line, `"log.type"`) > 1 {
			t.Fatalf("duplicate log.type key: %s", line)
		}
		m := map[string]any{}
		if err := json.Unmarshal([]byte(line), &m); err != nil {
			t.Fatalf("invalid JSON %q: %v", line, err)
		}
		out = append(out, m)
	}
	return out
}

func newRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(Middleware())
	r.GET("/health", func(c *gin.Context) { c.Status(http.StatusOK) })
	r.POST("/orders/:id", func(c *gin.Context) {
		c.Set("user_id", "u-1")
		Business(c, "order.created", "order created", slog.String("order.id", c.Param("id")))
		c.Status(http.StatusCreated)
	})
	admin := r.Group("/admin/hotels")
	admin.Use(Audit("catalog"))
	admin.PUT("/rooms/:id", func(c *gin.Context) { c.Status(http.StatusOK) })
	return r
}

func TestAccessAndBusinessLogsUseStandardSchema(t *testing.T) {
	buf := captureLogs(t, slog.LevelInfo)
	req := httptest.NewRequest(http.MethodPost, "/orders/42", nil)
	req.Header.Set("X-Request-ID", "req-abc")
	req.Header.Set("traceparent", "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01")
	newRouter().ServeHTTP(httptest.NewRecorder(), req)

	lines := decodeLines(t, buf)
	if len(lines) != 2 {
		t.Fatalf("want 2 lines (business + access), got %d: %s", len(lines), buf.String())
	}
	biz, access := lines[0], lines[1]
	for _, m := range lines {
		for _, k := range []string{"timestamp", "level", "message", "service.name", "log.type", "request_id", "trace_id"} {
			if _, ok := m[k]; !ok {
				t.Errorf("missing key %q in %v", k, m)
			}
		}
		if m["request_id"] != "req-abc" || m["trace_id"] != "4bf92f3577b34da6a3ce929d0e0e4736" {
			t.Errorf("correlation ids not propagated: %v", m)
		}
	}
	if biz["log.type"] != TypeBusiness || biz["event.name"] != "order.created" || biz["order.id"] != "42" {
		t.Errorf("unexpected business line: %v", biz)
	}
	if access["log.type"] != TypeAccess || access["http.response.status_code"] != float64(201) ||
		access["http.route"] != "/orders/:id" || access["user.id"] != "u-1" {
		t.Errorf("unexpected access line: %v", access)
	}
}

func TestHealthProbeIsDebugOnly(t *testing.T) {
	buf := captureLogs(t, slog.LevelInfo)
	newRouter().ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/health", nil))
	if buf.Len() != 0 {
		t.Fatalf("health probe should not be logged at INFO: %s", buf.String())
	}
}

func TestAuditMiddleware(t *testing.T) {
	buf := captureLogs(t, slog.LevelInfo)
	newRouter().ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPut, "/admin/hotels/rooms/r-9", nil))
	lines := decodeLines(t, buf)
	if len(lines) != 2 || lines[0]["event.name"] != "catalog.rooms.updated" || lines[0]["audit.resource_id"] != "r-9" {
		t.Fatalf("unexpected audit output: %s", buf.String())
	}
}

func TestLegacyLogPrintfBecomesJSONWithLevel(t *testing.T) {
	buf := captureLogs(t, slog.LevelInfo)
	log.Printf("ERROR: something broke: %v", "boom")
	log.Printf("Warning: degraded")
	log.Printf("started")
	lines := decodeLines(t, buf)
	want := []string{"ERROR", "WARN", "INFO"}
	for i, m := range lines {
		if m["level"] != want[i] || m["log.type"] != TypeApp {
			t.Errorf("line %d: want level %s/log.type app, got %v", i, want[i], m)
		}
	}
}

func TestParseTraceparent(t *testing.T) {
	if _, _, ok := parseTraceparent("garbage"); ok {
		t.Error("garbage should not parse")
	}
	if _, _, ok := parseTraceparent("00-00000000000000000000000000000000-00f067aa0ba902b7-01"); ok {
		t.Error("all-zero trace id is invalid")
	}
}

func TestDemoSensitiveOnlyWhenEnabled(t *testing.T) {
	t.Setenv("LOG_DEMO_SENSITIVE", "")
	if got := DemoSensitive("auth"); got != nil {
		t.Fatalf("expected nil when flag off, got %v", got)
	}
	t.Setenv("LOG_DEMO_SENSITIVE", "true")
	got := DemoSensitive("payment")
	if len(got) == 0 || got[0].Key != "sensitive.dummy" {
		t.Fatalf("expected dummy marker first, got %v", got)
	}
	if DemoSensitive("unknown") != nil {
		t.Fatal("unknown kind should return nil")
	}
}
