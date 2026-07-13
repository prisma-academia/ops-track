1. Transporter & Fleet Management Module
This module handles all external and internal logistics, driver details, and financial reconciliations regarding the trucks.
Transporter Profiles & KYC: * Add Transporters (Name, Full KYC documents).
Truck Details (Truck Name/ID, Truck Size/Capacity).
Driver Details (Driver's Name, Driver's Phone Number).
Transport Initiation:
Initiate transport and assign trucks to specific orders.
Note: The system must support a one-to-many relationship (assigning multiple trucks to a single order).
Transport Route Details: Destination, Transport Type, Rate, Liters carried.
Transfort Completion(action button)
Litres Delivered
Truck details 
Add another Subsequent delivery location (can add multiple locations and fees per litre)


Transport Financials & Deductions (Tabs/Tables)
This section will feature dedicated tabs for tracking the profitability and losses associated with each trip.
Tab A: Transport Fees & Earnings
Transporter
Base Rate
Deposits Made
Expenses/Deductions
Net Transport Fee Paid
Name
Amount
Amount
Amount
Calculated Total


Tab B: Maintenance & Deductions
Truck ID
Maintenance Cost
Liters Lost
Cash Deduction
Petroleum Equivalent (A)
Total Deduction
Action
Name
Amount
Volume
Amount
Volume equivalent
Calculated Total
[Report] [Comment]

Crucial Rule:
Deposits  for Transport fees can be recorded either as a flat cash amount or as its equivalent value in petroleum.
Deductions are to be made for any litres lost and maintenance done per car 
2. Order Management Module
This module tracks the procurement of fuel from the depot/source to the station or client.
Order Details: * Order Cost, Loading Cost, Transport Cost.
Liters Ordered, Petroleum Type (e.g., PMS, AGO, DPK).
Source/Depot.
Assigned Trucks.
Order Status Table
Order ID
Petroleum Type
Volume
Source
Status
Action
#1001
PMS
33,000L
Depot A
Pending
[Edit] [Cancel]
#1002
Kerosene
45,000L
Depot B
Changed
[View Swap]
#1003
AGO
15,000L
Depot C
Cancelled
[Refund Log]


Action Buttons: Confirm Order, Change Order (change/switch fuel type), Cancel Order, Record Cash Equivalent Returned.
3. Sales & Client Management Module
This module manages outbound fuel deliveries to end clients.
Sales Records:
Client's Name.
Truck Name/ID making the delivery.
Liters delivered 
Amount per Liter.
Total Amount Expected from Client.
		Actions button ; Liters Received by Client.

4. Financial Management Module
This module centralizes cash flow, tracking what goes out and what comes in.
Expenses
Personal Expenses: Miscellaneous or administrative costs.
Fleet-Related Expenses: Tolls, union dues, truck repairs, etc.
Payments Made (Outflow)
Transport Payments: Includes dropdowns to pull existing system data: [Select Order] > [Select Transporter] > [Select Client] > [Input Amount Paid].
Order Payments: Includes dropdown to pull data: [Select Source/Depot] > [Input Amount] > [Input Relevant Details].
Payments Received (Inflow)
Sales ID
Client Name
Amount
Purpose
Date
ID
Name
Amount
Invoice settlement/Deposit
DD/MM/YYYY


5. Roles & Access Control
Role-Based Access Control (RBAC) ensures staff only see what they need to see.
Transport Manager:
Permissions: Add transporters, upload/verify KYC info, record deposits, calculate and log deductions, manage truck assignments.
Order Confirmer:
Permissions: Update order statuses, confirm placed orders, track and confirm cars currently in transit.


Payments Received Module
This section will link directly to the Sales Module (where you record the Liters Sold and Expected Amount) to track exactly who owes you and who has settled their bills.
Payment Entry Form (Logging Inflows)
When a client makes a payment, your team will log it using these fields:
Client Name (Dropdown): Pulls from your existing client database.
Sales ID / Order Reference (Dropdown): Automatically populates pending invoices/deliveries linked to that specific client.
Amount Paid (Number field): The exact amount deposited.
Payment Purpose (Dropdown): * Advance Deposit
Part Payment
Full Settlement
Debt Clearance
Payment Method (Dropdown): Bank Transfer, Cash, Cheque.
Date (Date picker): When the money hit the account.
Transaction Reference (Text field): Bank teller number or transfer ID.
Attach Proof (File upload): Upload deposit slips or transfer receipts.
Client Receivables & Debt Ledger (Table)
This is the most critical view for tracking client balances. The system will automatically subtract the Amount Paid from the Amount Expected (from the Sales Module) to show you who is in debt.
Client Name
Sales ID
Total Expected
Total Paid
Outstanding Balance
Status
Action
Alpha Logistics
#S-101
₦5,000,000
₦3,000,000
₦2,000,000
Part-Paid
[Log Payment]
Beta Transport
#S-102
₦2,500,000
₦2,500,000
₦0
Cleared
[View Receipt]
Gamma Haulage
#S-103
₦8,000,000
₦0
₦8,000,000
Unpaid
[Send Reminder]



Recent Inflows Log (Table)
A simple, running ledger of all money coming into the business on a daily basis.
Receipt ID
Date
Client Name
Amount Received
Payment Method
Linked Sales ID
#REC-001
08/06/2026
Alpha Logistics
₦3,000,000
Transfer
#S-101
#REC-002
09/06/2026
Beta Transport
₦2,500,000






