package clients

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type PriceCalculationRequest struct {
	BasePrice float64 `json:"basePrice"`
	TaxRate   float64 `json:"taxRate"`
	Discount  float64 `json:"discount"`
	Quantity  int     `json:"quantity"`
}

type PriceCalculationResponse struct {
	BasePrice float64 `json:"basePrice"`
	Tax       float64 `json:"tax"`
	Discount  float64 `json:"discount"`
	TotalPrice float64 `json:"totalPrice"`
	Currency   string  `json:"currency"`
}

type PricingClient interface {
	CalculatePrice(basePrice float64, taxRate float64, discount float64, qty int) (*PriceCalculationResponse, error)
}

type pricingClient struct {
	httpClient *http.Client
}

func NewPricingClient() PricingClient {
	return &pricingClient{
		httpClient: &http.Client{Timeout: 5 * time.Second},
	}
}

func (c *pricingClient) CalculatePrice(basePrice float64, taxRate float64, discount float64, qty int) (*PriceCalculationResponse, error) {
	url := os.Getenv("PRICING_SERVICE_URL")
	if url == "" {
		url = "http://localhost:8086"
	}

	reqBody := PriceCalculationRequest{
		BasePrice: basePrice,
		TaxRate:   taxRate,
		Discount:  discount,
		Quantity:  qty,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Post(fmt.Sprintf("%s/pricing/calculate", url), "application/json", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("pricing_error: status %d", resp.StatusCode)
	}

	var res PriceCalculationResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	return &res, nil
}
