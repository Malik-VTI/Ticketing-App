# Ticketing App - Remaining Bug Fixes Task List

This document outlines high-level tasks for resolving the latest bugs found during manual testing. The app is being run locally (without Docker), so keep local port configurations in mind when debugging.

## 1. Booking Confirmation Error (Type Conversion & Pricing)

**Issue Details:** 
When confirming a booking, the system throws two notable errors:
1. `json: cannot unmarshal string into Go struct field CreateBookingItemRequest.items.quantity of type int`
2. `pricing_validation_failed: pricing_error: status 500`

**High-Level Steps to Fix:**
*   **Frontend Payload Verification:** Check the frontend components (e.g., `Trains.tsx`, `Flights.tsx`) where the booking payload is constructed. Ensure that the `quantity` (or `numPassengers`) is explicitly converted to an integer (using `parseInt()` or `Number()`) before making the API call, rather than being passed as a string from an input field.
*   **Pricing Service Integration:** Investigate the `pricing_error: status 500`. It is likely that the booking service is trying to call the pricing service for validation and failing. Check the Booking Service logs to see exactly what URL it is calling (`localhost:8086/pricing/calculate`) and ensure no internal connections are refused or timing out on the local setup.

## 2. Payment to Booking Status Synchronization

**Issue Details:**
After completing a payment successfully, the overall booking status remains "pending" instead of transitioning to "confirmed".

**High-Level Steps to Fix:**
*   **Payment Service Call:** The Payment Service is responsible for notifying the Booking Service once an order is paid. Check the `confirmBooking` function in the Payment Service repository. Ensure the HTTP POST request to the Booking Service (`/bookings/{id}/confirm`) is using the correct absolute local URL (e.g., `http://localhost:8082/...` instead of Docker hostnames) since the environment is running locally.
*   **Review Local Logs:** Inspect the terminal logs for both the Payment Service and Booking Service during the payment flow to see if the HTTP request is failing due to connection refusion or returning a 400/500 code.

## 3. Missing Admin Data Entry Forms

**Issue Details:**
The Admin Dashboard does not currently provide forms or user interfaces to actually add new inventory data (Trains, Hotels, Flights).

**High-Level Steps to Fix:**
*   **Frontend UI Creation:** Create new React components/pages (e.g., `AddTrainForm.tsx`, `AddFlightForm.tsx`, `AddHotelForm.tsx`) containing the necessary input fields matching the backend entities.
*   **Dashboard Navigation:** Update `AdminDashboard.tsx` to include clear action buttons ("Add New Train", "Add New Flight") that route the admin to these new forms.
*   **Backend Endpoint Verification:** Verify that the catalog services (Flight, Train, Hotel) have functional `POST` endpoints to accept new records, and ensure these endpoints are exposed through the API Gateway for the frontend to consume.
