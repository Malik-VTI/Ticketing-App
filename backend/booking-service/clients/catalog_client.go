package clients

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
)

type ReserveRequest struct {
	SeatNumbers []string `json:"seatNumbers,omitempty"`
	RoomTypeID  uuid.UUID `json:"roomTypeId,omitempty"`
	CheckIn     string    `json:"checkIn,omitempty"`
	CheckOut    string    `json:"checkOut,omitempty"`
	Quantity    int       `json:"quantity,omitempty"`
}

type CatalogClient interface {
	ReserveTrainSeats(scheduleID uuid.UUID, seatNumbers []string) error
	ReserveFlightSeats(scheduleID uuid.UUID, seatNumbers []string) error
	ReserveHotelRooms(hotelID uuid.UUID, rtID uuid.UUID, checkIn, checkOut string, qty int) ([]string, error)
	ReleaseTrainSeats(scheduleID uuid.UUID, seatNumbers []string) error
	ReleaseFlightSeats(scheduleID uuid.UUID, seatNumbers []string) error
	ReleaseHotelRooms(hotelID uuid.UUID, rtID uuid.UUID, roomNumbers []string) error
}

type catalogClient struct {
	httpClient *http.Client
}

func NewCatalogClient() CatalogClient {
	return &catalogClient{
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *catalogClient) ReserveTrainSeats(scheduleID uuid.UUID, seatNumbers []string) error {
	url := os.Getenv("TRAIN_SERVICE_URL")
	if url == "" {
		url = "http://localhost:8084"
	}

	reqBody := ReserveRequest{SeatNumbers: seatNumbers}
	return c.doPost(fmt.Sprintf("%s/trains/schedules/%s/reserve", url, scheduleID), reqBody, nil)
}

func (c *catalogClient) ReserveFlightSeats(scheduleID uuid.UUID, seatNumbers []string) error {
	url := os.Getenv("FLIGHT_SERVICE_URL")
	if url == "" {
		url = "http://localhost:8083"
	}

	reqBody := ReserveRequest{SeatNumbers: seatNumbers}
	return c.doPost(fmt.Sprintf("%s/flights/schedules/%s/reserve", url, scheduleID), reqBody, nil)
}

func (c *catalogClient) ReserveHotelRooms(hotelID uuid.UUID, rtID uuid.UUID, checkIn, checkOut string, qty int) ([]string, error) {
	url := os.Getenv("HOTEL_SERVICE_URL")
	if url == "" {
		url = "http://localhost:8085"
	}

	reqBody := ReserveRequest{
		RoomTypeID: rtID,
		CheckIn:    checkIn,
		CheckOut:   checkOut,
		Quantity:   qty,
	}

	var respBody struct {
		RoomNumbers []string `json:"room_numbers"`
	}

	err := c.doPost(fmt.Sprintf("%s/hotels/%s/reserve", url, hotelID), reqBody, &respBody)
	if err != nil {
		return nil, err
	}
	return respBody.RoomNumbers, nil
}

func (c *catalogClient) doPost(url string, body interface{}, response interface{}) error {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Post(url, "application/json", bytes.NewReader(jsonBody))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		var errResp struct {
			Error   string `json:"error"`
			Message string `json:"message"`
		}
		_ = json.Unmarshal(body, &errResp)
		detail := strings.TrimSpace(errResp.Error + " - " + errResp.Message)
		if detail == "-" {
			snippet := strings.TrimSpace(string(body))
			if len(snippet) > 200 {
				snippet = snippet[:200] + "…"
			}
			if snippet != "" {
				detail = snippet
			} else {
				detail = http.StatusText(resp.StatusCode)
			}
		}
		return fmt.Errorf("catalog_error (HTTP %d): %s", resp.StatusCode, detail)
	}

	if response != nil {
		return json.NewDecoder(resp.Body).Decode(response)
	}

	return nil
}

func (c *catalogClient) ReleaseTrainSeats(scheduleID uuid.UUID, seatNumbers []string) error {
	url := os.Getenv("TRAIN_SERVICE_URL")
	if url == "" {
		url = "http://localhost:8084"
	}

	reqBody := ReserveRequest{SeatNumbers: seatNumbers}
	return c.doPost(fmt.Sprintf("%s/trains/schedules/%s/release", url, scheduleID), reqBody, nil)
}

func (c *catalogClient) ReleaseFlightSeats(scheduleID uuid.UUID, seatNumbers []string) error {
	url := os.Getenv("FLIGHT_SERVICE_URL")
	if url == "" {
		url = "http://localhost:8083"
	}

	reqBody := ReserveRequest{SeatNumbers: seatNumbers}
	return c.doPost(fmt.Sprintf("%s/flights/schedules/%s/release", url, scheduleID), reqBody, nil)
}

func (c *catalogClient) ReleaseHotelRooms(hotelID uuid.UUID, rtID uuid.UUID, roomNumbers []string) error {
	url := os.Getenv("HOTEL_SERVICE_URL")
	if url == "" {
		url = "http://localhost:8085"
	}

	reqBody := struct {
		RoomNumbers []string `json:"room_numbers"`
		RoomTypeID  uuid.UUID `json:"room_type_id"`
	}{
		RoomNumbers: roomNumbers,
		RoomTypeID:  rtID,
	}

	return c.doPost(fmt.Sprintf("%s/hotels/%s/release", url, hotelID), reqBody, nil)
}
