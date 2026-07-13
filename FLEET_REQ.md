
User Stories: Logistics & Fleet Management
1. Procurement & Order Management
●	As a Logistics Manager, I want to create a procurement order that includes fuel costs, loading fees, and transport expenses, so that I have a single source of truth for the total cost of goods delivered.
●	As a Logistics Manager, I want to modify an existing order if the depot changes the product type mid-transit, so that my inventory and cost records remain accurate.
●	As a Logistics Manager, I want to record a "Cash Equivalent Returned" for cancelled orders, so that I can reconcile the financial loss and keep the ledger balanced.
2. Transport & Fleet Operations
●	As a Logistics Manager, I want to initiate a transport trip with specific rates per liter, so that the system can track the vehicle's progress and calculate payments accurately.
●	As a Logistics Manager, I want to log multiple delivery stops for a single truck (subsequent locations), so that I can calculate varying commission/delivery rates for complex routes.
●	As a Logistics Manager, I want the system to automatically calculate financial deductions based on liters lost in transit, so that the transporter is held accountable for product loss without manual calculation errors.
3. Sales & Revenue
●	As a Sales Manager, I want to link a sale to a specific transport trip, so that the system can automatically derive the truck ID and verify delivered volumes.
●	As a Sales Manager, I want to see the payment status of an invoice update automatically when a deposit is received, so that I can immediately identify which clients still have outstanding balances.
4. Compliance & Administration
●	As an Administrator, I want to upload and store business identity documents (RC, TIN, etc.) and driver/vehicle certifications in the system, so that I have a centralized, digital repository for transporter compliance.
●	As an Administrator, I want to create a new transporter and their first assigned truck in one continuous workflow, so that onboarding new logistics partners is fast and efficient.
5. Financial Reconciliation
●	As an Accountant, I want to view an immutable ledger of all financial inflows and outflows, so that I can audit the system’s performance and ensure all transport fees and client payments align.
●	As an Accountant, I want the system to calculate the final "Net Transport Fee Paid" after all maintenance costs and product loss penalties are applied, so that we never overpay a transporter.


Exhaustive System Documentation & Technical Reference
This document provides a highly granular, code-level breakdown of the ASA-FUEL Logistics & Fleet Management System. It explicitly documents every schema definition, API endpoint, form state, and reconciliation algorithm used in the application.
1. Database Schema & Data Models (Prisma)
The system relies on a PostgreSQL database managed via Prisma and queried via Supabase.
1.1 Core Entities
●	User: System access. Fields: id, name, email, role, locationId, isActive.
●	Location: Depots or branches. Fields: id, name, address, managerId.
●	Inventory: Fuel stock at locations. Fields: locationId, petroleumType, currentVolume, reservedVolume.
●	Client: Customers. Fields: id, name, isActive.
●	Transporter: Third-party logistics companies. Fields: id, name, kycDocuments.
●	Truck: Physical vehicles. Fields: id, transporterId, truckNameId, capacityLiters, driverName.
●	Order: Procurement from depots. Fields: litersOrdered, orderCost (base fuel cost), transportCost (freight to bring it in), loadingCost, status (PENDING, CONFIRMED, CHANGED, CANCELLED).
●	Sale: Revenue generation from clients. Fields: clientId, truckId, litersDespatched, litersReceived, amountPerLiter, paymentReceived, totalExpectedAmount, status (UNPAID, PART_PAID, CLEARED).
●	Transport: Outbound logistics trips. Fields: orderId, truckId, destination, ratePerLiter, litersCarried, subsequentLocs, litersDelivered, maintenanceCost, litersLost, totalDeduction, netTransportFeePaid.
●	Transaction: Immutable unified ledger. Fields: type (INFLOW, OUTFLOW), category (TRANSPORT_PAYMENT, CLIENT_PAYMENT, etc.), amount, paymentPurpose, reference.
2. Server-Side Logic & API Endpoints
The API is structured using Next.js App Router API Routes (src/app/api/*). The API exclusively interacts with the database using the server-side client (createClient()).
2.1 /api/sales
●	GET: Returns all sales, joining relational data (Client, Truck, Transport, Transaction).
●	POST: Creates a new sale.
○	Required Payload: clientId, transportId, litersDespatched, litersReceived, amountPerLiter.
○	Logic: Dynamically looks up the truckId from the linked transportId. Calculates totalExpectedAmount = litersReceived * amountPerLiter. Initial status set to UNPAID.
2.2 /api/sales/[id] (The Reconciliation Engine)
●	PATCH: Edits an existing sale and runs the automated reconciliation engine.
○	Logic: If litersReceived is updated, it updates the sale's totalExpectedAmount.
○	Trigger (Cross-Model Update): If the sale is linked to a transport trip (transportId), it queries all sales linked to that same transport. It sums the total litersReceived by all clients on that route.
○	Loss Calculation: litersLost = Math.max(0, transport.litersCarried - totalReceived).
○	Cash Deduction for Loss: The transporter is penalized for the loss: cashDeductionForLoss = litersLost * transport.ratePerLiter.
○	Net Payout Update: The transport's totalDeduction is updated to existingMaintenance + cashDeductionForLoss. The netTransportFeePaid is reduced accordingly.
2.3 /api/transports
●	POST: Initiates a new trip.
○	Payload: orderId, truckId, transporterId, destination, transportType (EXTERNAL/INTERNAL), ratePerLiter, litersCarried.
○	Status: Initialized as IN_TRANSIT.
2.4 /api/transports/[id]
●	PATCH: Completes a trip and computes complex financial ledgers (Tab A & Tab B).
○	Fields Allowed: litersDelivered, subsequentLocs (JSON array of { location, rate, litersDelivered }), addDeposit, addMaintenanceCost, addLitersLost.
○	Base Earnings Logic: baseRate = existing.ratePerLiter * existing.litersCarried.
○	Extra Earnings Logic: Iterates over the subsequentLocs JSON array, calculating (loc.rate * loc.litersDelivered) for every extra drop and adds it to baseRate.
○	Deduction Logic: deductionFromLitersLost = currentLitersLost * ratePerLiter. totalDeduction = deductionFromLitersLost + currentMaintenance.
○	Net Payout Logic: netTransportFeePaid = baseRate - totalDeduction.
2.5 /api/transactions
●	POST: The master ledger endpoint.
○	Logic: Inserts a record tracking money movement.
○	Trigger: If type === 'INFLOW' and saleId is provided, it automatically fetches the associated Sale, calculates the new paymentReceived, checks if it meets the totalExpectedAmount, and updates the Sale status to CLEARED or PART_PAID.
2.6 /api/orders
●	POST: Creates a procurement order. Calculates logistics costs upfront (orderCost, loadingCost, transportCost).
●	PATCH (/api/orders/[id]): Used primarily via the ChangeOrderForm to update petroleumType or handle cashEquivalentReturned if an order is cancelled or modified mid-transit.
3. UI Forms & Component State Management
All 17 forms reside in src/components/forms/ and rely on React hooks (useState for loading/error states, useEffect for data fetching). They interact with the API via FormData parsing.
3.1 Client Management Forms
●	CreateClientForm.tsx
○	Inputs: name, phone, email, address, contactPerson, clientType.
○	API: POST /api/clients.
●	LogPaymentForm.tsx (Client Deposit)
○	Inputs: amount, paymentMethod, reference, saleId (optional link to specific invoice).
○	API: POST /api/transactions. Automatically updates the Client Debt Ledger by virtue of the INFLOW category.
3.2 Transport & Fleet Forms
●	AddTransporterForm.tsx
○	Inputs: Transporter Name, Business Identity (RC Number, TIN, Certificate of Incorporation File), Personal Identity (Valid ID, Proof of Address, Bank Name, Account Name, Account Number), Vehicle & Driver KYC (Driver License File, Guarantor Form File, Vehicle License File, Road Worthiness File, GIT Insurance File), and initial Truck details (truckNameId, capacityLiters, driverName, driverPhone).
○	Logic: Extracts all file fields to simulate paths, and structures all extensive text KYC details into a single kycDocuments JSON object to match the Prisma schema without requiring a database migration.
○	Inputs: Transporter Name, and initial Truck details (truckNameId, capacityLiters, driverName, driverPhone).
○	API: POST /api/transporters. Uniquely handles two inserts: creates the Transporter and then immediately creates the first Truck belonging to them.
●	InitiateTransportForm.tsx
○	Inputs: orderId, transporterId, truckId, destination, transportType, ratePerLiter, litersCarried.
●	CompleteTransportForm.tsx
○	Inputs: litersDelivered. Includes dynamic UI rows for adding multiple subsequentLocs (Client Name, Location, Fee/Liter, Liters Delivered).
○	Logic: Filters out empty rows before stringifying to JSON and sending the PATCH request to /api/transports/[id].
●	LogDeductionForm.tsx & ManageDeductionsForm.tsx
○	Inputs: addLitersLost, addMaintenanceCost.
○	Logic: Allows transport managers to penalize a trip. The PATCH to the transport API triggers the deduction calculation automatically.
3.3 Sales & Invoicing Forms
●	CreateSaleForm.tsx
○	Inputs: clientId, transportId, orderId (optional), litersDespatched, litersReceived, amountPerLiter.
○	State Logic: Fetches available clients and transports in useEffect. When submitting, it matches the selected transportId to find the exact physical truckId to attach to the Sale.
●	EditSaleForm.tsx
○	Inputs: Updates amountPerLiter and litersDespatched.
3.4 Procurement Forms
●	CreateOrderForm.tsx
○	Inputs: petroleumType, litersOrdered, sourceDepot, depotTicketNumber, expectedDeliveryDate, orderCost, loadingCost, transportCost.
●	ChangeOrderForm.tsx
○	Logic: Modifies an existing order's fuel type if the depot switches product (e.g., from PMS to AGO). Updates status to CHANGED.
●	LogRefundForm.tsx
○	Logic: Specifically handles cancelled orders, capturing cashEquivalentReturned to reconcile the financial loss.
