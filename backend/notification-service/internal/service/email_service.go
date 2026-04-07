package service

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"html/template"
	"log"
	"net"
	"net/smtp"
	"os"
	"strconv"

	"notification-service/internal/models"
)

// EmailService sends notification emails via SMTP
type EmailService interface {
	Send(req *models.SendNotificationRequest) error
}

type emailService struct {
	host     string
	port     int
	user     string
	password string
	from     string
}

func NewEmailService() EmailService {
	return &emailService{
		host:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		port:     getEnvAsInt("SMTP_PORT", 587),
		user:     getEnv("SMTP_USER", ""),
		password: getEnv("SMTP_PASS", ""),
		from:     getEnv("SMTP_FROM", "noreply@ticketing.app"),
	}
}

func (s *emailService) Send(req *models.SendNotificationRequest) error {
	subject, body, err := s.buildEmail(req)
	if err != nil {
		return fmt.Errorf("failed to build email: %w", err)
	}

	if s.user == "" || s.password == "" {
		// SMTP not configured — log and skip rather than failing the caller
		log.Printf("[notification] SMTP not configured. Would send '%s' to %s", subject, req.Email)
		log.Printf("[notification] Body preview: %.200s...", body)
		return nil
	}

	return s.sendSMTP(req.Email, subject, body)
}

func (s *emailService) buildEmail(req *models.SendNotificationRequest) (string, string, error) {
	name := req.Name
	if name == "" {
		name = "Valued Customer"
	}

	var subject string
	var tmplStr string

	switch req.Type {
	case models.TypeBookingConfirmation:
		subject = "Booking Confirmed — " + req.Reference
		tmplStr = bookingConfirmationTemplate
	case models.TypePaymentConfirmation:
		subject = "Payment Received — " + req.Reference
		tmplStr = paymentConfirmationTemplate
	case models.TypeBookingCancelled:
		subject = "Booking Cancelled — " + req.Reference
		tmplStr = bookingCancelledTemplate
	default:
		return "", "", fmt.Errorf("unknown notification type: %s", req.Type)
	}

	tmpl, err := template.New("email").Parse(tmplStr)
	if err != nil {
		return "", "", err
	}

	data := map[string]interface{}{
		"Name":      name,
		"Reference": req.Reference,
		"BookingID": req.BookingID,
		"Amount":    req.Amount,
		"Currency":  req.Currency,
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", "", err
	}
	return subject, buf.String(), nil
}

func (s *emailService) sendSMTP(to, subject, body string) error {
	addr := net.JoinHostPort(s.host, strconv.Itoa(s.port))
	auth := smtp.PlainAuth("", s.user, s.password, s.host)

	var tlsConfig *tls.Config
	if s.port == 465 {
		// SSL
		tlsConfig = &tls.Config{ServerName: s.host}
	}

	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		s.from, to, subject, body,
	)

	if tlsConfig != nil {
		conn, err := tls.Dial("tcp", addr, tlsConfig)
		if err != nil {
			return fmt.Errorf("TLS dial failed: %w", err)
		}
		client, err := smtp.NewClient(conn, s.host)
		if err != nil {
			return err
		}
		defer client.Close()
		if err := client.Auth(auth); err != nil {
			return err
		}
		if err := client.Mail(s.from); err != nil {
			return err
		}
		if err := client.Rcpt(to); err != nil {
			return err
		}
		w, err := client.Data()
		if err != nil {
			return err
		}
		if _, err := fmt.Fprint(w, msg); err != nil {
			return err
		}
		return w.Close()
	}

	// STARTTLS (port 587)
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		return fmt.Errorf("dial failed: %w", err)
	}
	client, err := smtp.NewClient(conn, s.host)
	if err != nil {
		return err
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: s.host}); err != nil {
			return fmt.Errorf("STARTTLS failed: %w", err)
		}
	}
	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("SMTP auth failed: %w", err)
	}
	if err := client.Mail(s.from); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := fmt.Fprint(w, msg); err != nil {
		return err
	}
	return w.Close()
}

// --- Email templates ---

const bookingConfirmationTemplate = `
<html><body style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
<h2 style="color:#1a73e8">Booking Confirmed ✓</h2>
<p>Hi {{.Name}},</p>
<p>Your booking has been confirmed. Here are your details:</p>
<table style="width:100%;border-collapse:collapse">
  <tr><td style="padding:8px;font-weight:bold">Reference</td><td style="padding:8px">{{.Reference}}</td></tr>
</table>
<p style="margin-top:24px">Thank you for booking with us!</p>
<p style="color:#888;font-size:12px">This is an automated message. Please do not reply.</p>
</body></html>
`

const paymentConfirmationTemplate = `
<html><body style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
<h2 style="color:#1a73e8">Payment Received ✓</h2>
<p>Hi {{.Name}},</p>
<p>We have received your payment for booking <strong>{{.Reference}}</strong>.</p>
{{if .Amount}}<p>Amount paid: <strong>{{.Currency}} {{.Amount}}</strong></p>{{end}}
<p style="margin-top:24px">Your booking is now confirmed. Have a great trip!</p>
<p style="color:#888;font-size:12px">This is an automated message. Please do not reply.</p>
</body></html>
`

const bookingCancelledTemplate = `
<html><body style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
<h2 style="color:#d93025">Booking Cancelled</h2>
<p>Hi {{.Name}},</p>
<p>Your booking <strong>{{.Reference}}</strong> has been cancelled.</p>
<p>If you did not request this cancellation or have any questions, please contact support.</p>
<p style="color:#888;font-size:12px">This is an automated message. Please do not reply.</p>
</body></html>
`

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getEnvAsInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return def
}
