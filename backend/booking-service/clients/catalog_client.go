package clients

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
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
		url = "http://localhost:8083" // Wait, check docker-compose for hotel service port
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
		var errResp struct {
			Error   string `json:"error"`
			Message string `json:"message"`
		}
		json.NewDecoder(resp.Body).Decode(&errResp)
		return fmt.Errorf("catalog_error: %s - %s", errResp.Error, errResp.Message)
	}

	if response != nil {
		return json.NewDecoder(resp.Body).Decode(response)
	}

	return nil
}
