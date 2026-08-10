# Fleet & Station Management System

## Architecture, Fixes & Improvement Plan

> **Purpose:** This document defines the architecture, database improvements, business rules, module structure, permissions, and implementation phases for the next version of the application.
>
> The goal is to build a scalable multi-tenant platform that supports both:
>
> * Fleet managers/distributors who supply PMS, AGO and other products to stations/customers.
> * Station owners who independently manage their own stations.
> * Fleet managers who also manage their own or external client stations.
>
> Do not implement changes blindly. Before modifying existing models, inspect the current schema and relationships and preserve existing functionality where possible.

---

# 1. Core Business Model

The system must support two major business capabilities:

```text
FLEET
├── Product Supply
├── Orders
├── Transporters
├── Trucks
├── Drivers
├── Transports
├── Trip Legs
├── Driver Assignments
└── Deliveries

STATION
├── Stations
├── Tanks
├── Pumps
├── Nozzles
├── Stock
├── Sales
├── Expenses
├── Shifts
└── Reports
```

A tenant may have either or both modules.

Examples:

```text
Fleet Manager
Modules: FLEET + STATION

Independent Station Owner
Modules: STATION

Fleet Distributor
Modules: FLEET
```

---

# 2. Tenant Architecture

## Tenant

A `Tenant` represents the company/account/workspace using the platform.

It owns the platform-level configuration, users, enabled modules, subscription, and business data.

## Organization

An `Organization` represents a business/company/entity being operated or managed inside a tenant.

Use organization ownership to distinguish internal and external businesses.

```text
Tenant
│
├── Internal Organization
│   ├── Station A
│   └── Station B
│
└── External Organization
    ├── Client Station A
    └── Client Station B
```

### Organization Types

```text
INTERNAL
EXTERNAL
```

Meaning:

* `INTERNAL`: owned/operated by the tenant.
* `EXTERNAL`: an external client/business managed by the tenant.

Do not confuse `Tenant` and `Organization`.

---

# 3. Module Access Architecture

The tenant controls which modules are available.

```text
Tenant Module Access
        ↓
User Module Access
        ↓
User Permissions

        ↓
Feature Access
```

A user must never be able to access a module that the tenant does not have enabled.

Example:

```text
Tenant:
FLEET = false
STATION = true

User:
fleetPermissions = ["..."]

Result:
Fleet access = DENIED
```

The backend must enforce this. Do not rely only on hiding navigation items in the frontend.

## Recommended Module Enum

```prisma
enum AppModule {
  FLEET
  STATION
}
```

Prefer `AppModule[]` over an unrestricted `String[]` for module access.

## Future Improvement

Consider introducing a dedicated `TenantModule` model:

```text
TenantModule
├── tenantId
├── module
├── status
├── enabledAt
├── expiresAt
└── settings
```

This will support future subscriptions, trials, billing, module limits, and feature configuration.

---

# 4. User & Permission Architecture

Use three levels:

```text
Tenant
   ↓
User
   ↓
Module Permissions
```

A user can have:

```text
FLEET
├── fleet.read
├── fleet.create
├── fleet.update
├── fleet.delete
└── fleet.assign

STATION
├── station.read
├── station.create
├── station.update
├── station.delete
└── station.manage
```

The effective permission must always be:

```text
Tenant has module
AND
User has module
AND
User has permission
```

Never allow a user to bypass tenant-level module restrictions.

---

# 5. Fleet Module

The Fleet module is responsible for distributing PMS, AGO and other products to stations/customers.

Recommended structure:

```text
Fleet
├── Dashboard
├── Orders
├── Transporters
├── Trucks
├── Drivers
├── Transports
├── Trip Legs
├── Driver Assignments
├── Deliveries
├── Customers
└── Fleet Reports
```

---

# 6. Transporter Architecture

A `Transporter` represents the company/entity responsible for providing or operating transportation resources.

Do not assume that every transporter is external.

Support:

```text
COMPANY_OWNED
EXTERNAL
```

Example:

```text
ABC Petroleum Fleet
ownership = COMPANY_OWNED

ABC Logistics
ownership = EXTERNAL
```

A company-owned fleet can therefore still have an internal transporter record.

This keeps the relationship consistent:

```text
Transporter
├── Trucks
└── Drivers
```

---

# 7. Truck Architecture

A truck is a fleet resource.

A truck should be associated with a transporter/fleet provider.

Important information should include:

```text
Truck
├── Registration Number
├── Truck Number
├── Capacity
├── Product Compartments
├── Ownership
├── Status
├── Transporter
├── Documents
└── Maintenance Information
```

Support:

```text
ACTIVE
INACTIVE
MAINTENANCE
SUSPENDED
RETIRED
```

Do not delete historical trucks that have already participated in transports. Prefer deactivation/retirement.

---

# 8. Driver Architecture

A driver is a human resource that can be assigned to one or more trip legs.

Support:

```text
EMPLOYEE
CONTRACTOR
```

Drivers should have:

```text
Driver
├── Personal Information
├── License Information
├── Status
├── Transporter/Fleet
├── Documents
└── Assignment History
```

Do not delete drivers with historical assignments.

Use status such as:

```text
ACTIVE
INACTIVE
SUSPENDED
EXPIRED
```

---

# 9. Transport Invitation Architecture

A transport invitation represents an offer/request to a transporter to handle an order.

The invitation should primarily target the **Transporter**, not force a specific driver and truck.

Recommended flow:

```text
Order
  ↓
Transport Invitation
  ↓
Transporter accepts/rejects
  ↓
Transporter provides/selects Truck + Driver
  ↓
Transport created
```

Therefore:

* `transporterId` is the primary relationship.
* `truckId` and `driverId` should not be mandatory at invitation creation.
* Actual truck and driver assignment belongs to the resulting `Transport`/`TripLeg`.

## Invitation Status

```text
PENDING
ACCEPTED
REJECTED
EXPIRED
CANCELLED
```

Never delete invitations that have already been responded to.

---

# 10. Company-Owned Fleet

The system must support company-owned fleet without requiring an external transporter.

Recommended conceptual flow:

```text
Order
  ↓
Internal Fleet Assignment
  ↓
Company Truck + Company Driver
  ↓
Transport
```

If the internal transporter model is retained, company-owned trucks/drivers can belong to an internal transporter record.

This avoids special-case relationships throughout the system.

---

# 11. Transport Architecture

A `Transport` represents the actual execution of an order.

Conceptually:

```text
Order
  ↓
Transport
  ├── Transporter
  ├── Truck
  ├── Driver
  └── Trip Legs
```

Do not use `Transport` as the complete representation of a multi-stage route.

The route must be represented by `TripLeg`.

---

# 12. Trip Leg Architecture

Use:

```text
Transport
   ↓
TripLeg[]
   ↓
DriverAssignment[]
```

Each `TripLeg` represents one movement in the journey.

Recommended types:

```prisma
enum TripLegType {
  ORIGIN_TO_DEPOT
  DEPOT_TO_PRIMARY
  PRIMARY_TO_SUBSEQUENT
  SUBSEQUENT_TO_SUBSEQUENT
  DESTINATION_TO_ORIGIN
}
```

Do not store subsequent destinations in a JSON array such as:

```text
subsequentLocs
```

Use relational records instead.

Example:

```text
Transport
│
├── Leg 1
│   Office → Depot
│
├── Leg 2
│   Depot → Primary Station
│
├── Leg 3
│   Primary Station → Station B
│
├── Leg 4
│   Station B → Station C
│
└── Leg 5
    Station C → Office
```

Use `sequence` to determine the order.

---

# 13. Trip Leg Status

Use:

```text
PENDING
ASSIGNED
IN_PROGRESS
COMPLETED
CANCELLED
```

Meaning:

### PENDING

Leg has been created but no driver has been assigned.

### ASSIGNED

Driver/resource has been assigned but movement has not started.

### IN_PROGRESS

Movement has started.

### COMPLETED

Destination reached and leg completed.

### CANCELLED

Leg will no longer be executed.

---

# 14. Driver Assignment Architecture

Driver assignment must belong to a specific trip leg.

```text
TripLeg
   ↓
DriverAssignment
   ↓
Driver
```

This supports:

### One driver for entire trip

```text
Leg 1 → Driver A
Leg 2 → Driver A
Leg 3 → Driver A
Leg 4 → Driver A
```

### Multiple drivers

```text
Leg 1 → Driver A
Leg 2 → Driver B
Leg 3 → Driver C
```

### Driver replacement

```text
Leg 2
├── Driver A → REASSIGNED
└── Driver B → ACTIVE
```

Never overwrite the previous assignment.

Preserve assignment history.

---

# 15. Driver Assignment Status

Use:

```text
PENDING
ACTIVE
COMPLETED
CANCELLED
REASSIGNED
```

Keep `TripLegStatus` and `DriverAssignmentStatus` separate.

They represent different things:

```text
TripLegStatus
= journey progress

DriverAssignmentStatus
= driver's responsibility
```

---

# 16. Station Module

The Station module should be usable independently from Fleet.

Recommended structure:

```text
Station Management
├── Stations
├── Tanks
├── Pumps
├── Nozzles
├── Products
├── Stock
├── Dipping
├── Shifts
├── Sales
├── Expenses
└── Reports
```

An independent station owner must be able to operate the station without Fleet access.

---

# 17. Station Ownership

Support:

```text
Internal Station
External Client Station
```

Example:

```text
ABC Petroleum
│
├── Internal
│   ├── Station A
│   └── Station B
│
└── External
    ├── Client Station X
    └── Client Station Y
```

A fleet manager can therefore manage external client stations while also operating its own stations.

---

# 18. Independent Station Owner

An independent station owner should be able to create:

```text
Tenant
└── Internal Organization
    ├── Station A
    └── Station B
```

with:

```text
Enabled Modules:
STATION
```

The Fleet module should be unavailable.

This restriction must be enforced in:

* Frontend navigation
* Backend authorization
* API endpoints
* Server actions
* Database/business logic

---

# 19. External Client Migration

The architecture should allow an external client to eventually become an independent tenant.

Example:

```text
Initially:

Fleet Tenant
└── External Organization
    └── XYZ Station
```

Later:

```text
XYZ Tenant
└── Internal Organization
    └── XYZ Station
```

The station data should be transferable without recreating the station from scratch.

Design ownership relationships carefully so this migration is possible.

---

# 20. Product Architecture

Products such as:

```text
PMS
AGO
Lubricants
Other Products
```

must be represented as reusable product records.

Product information should include:

```text
Product
├── Name
├── Code
├── Category
├── Unit
├── Active Status
└── Pricing Configuration
```

Avoid hardcoding PMS/AGO throughout the application.

---

# 21. Product Supply vs Retail Sales

Keep these two processes separate.

## Fleet/Product Supply

```text
Order
 ↓
Product
 ↓
Transport
 ↓
Delivery
 ↓
Station / Customer
```

## Station Retail Sales

```text
Station
 ↓
Tank
 ↓
Pump
 ↓
Nozzle
 ↓
Sale
```

Do not mix wholesale/product-delivery transactions with station retail transactions.

Reports should be able to distinguish:

```text
Product Supply / Wholesale
```

from:

```text
Station Retail Sales
```

---

# 22. Order Management

Orders should represent requests for product supply/transport.

Recommended structure:

```text
Order
├── Customer
├── Product(s)
├── Quantity
├── Destination
├── Pricing
├── Payment
├── Transport
└── Delivery
```

Order status should clearly represent the lifecycle.

Suggested:

```text
DRAFT
PENDING
CONFIRMED
ASSIGNED
IN_TRANSIT
DELIVERED
COMPLETED
CANCELLED
REJECTED
```

Avoid having multiple statuses that represent the same business state.

---

# 23. Delivery Architecture

Delivery should be a first-class concept rather than relying only on `Transport`.

Recommended flow:

```text
Order
 ↓
Transport
 ↓
Trip Legs
 ↓
Delivery
 ↓
Destination
```

Delivery should be able to capture:

```text
Requested Quantity
Dispatched Quantity
Delivered Quantity
Shortage
Delivery Status
Delivered At
Proof of Delivery
Receiver
Notes
```

This will be important for fuel/product reconciliation.

---

# 24. Inventory & Product Reconciliation

The system should eventually track:

```text
Ordered Quantity
      ↓
Loaded Quantity
      ↓
Dispatched Quantity
      ↓
Delivered Quantity
      ↓
Received Quantity
      ↓
Station Stock
```

The system should be able to identify discrepancies.

Example:

```text
Ordered:     33,000 L
Dispatched:  33,000 L
Delivered:   32,950 L
Difference:      50 L
```

Do not silently overwrite quantities.

Keep transaction history.

---

# 25. Station Stock

Station stock should be derived from inventory movements rather than manually overwriting balances.

Use movements such as:

```text
OPENING_BALANCE
DELIVERY
SALE
ADJUSTMENT
TRANSFER
RETURN
LOSS
```

Every stock change should create an auditable transaction.

---

# 26. Tank / Pump / Nozzle Structure

Maintain:

```text
Station
 ↓
Tank
 ↓
Pump
 ↓
Nozzle
```

Products should be linked to tanks/nozzles where appropriate.

Avoid duplicating product definitions at every level.

---

# 27. Sales Architecture

Sales should distinguish between:

### Retail Sale

Fuel sold directly at a station.

### Supply/Wholesale Sale

Product sold/dispatched to a customer or external station.

Use clear transaction types if both are stored in the same financial system.

---

# 28. Payment Architecture

Payments should be independent financial records.

Do not treat an order as automatically paid simply because a payment record exists.

Track:

```text
UNPAID
PARTIALLY_PAID
PAID
OVERPAID
REFUNDED
```

Payments should reference the relevant financial transaction/order.

---

# 29. Profit & Reporting

Separate operational transactions from reporting calculations.

Reports should support:

```text
Sales
Revenue
Payments
Expenses
Cost of Goods
Gross Profit
Net Profit
Outstanding Payments
Station Performance
Fleet Performance
Product Performance
```

Do not store calculated profit values unless there is a strong reason.

Prefer deriving them from auditable transactions.

---

# 30. Customer / Client / Organization Cleanup

Review overlapping concepts:

```text
Client
Customer
Organization
Supplier
Transporter
TransportCompany
```

Define each clearly.

Recommended meaning:

```text
Tenant
= platform account/workspace

Organization
= business/company entity

Customer
= buyer/business receiving products/services

Transporter
= transportation provider/operator

Supplier
= party supplying products to the business

TenantUser
= person operating the tenant account
```

If `Client` and `Customer` represent the same business concept, merge them instead of maintaining duplicate entities.

If `TransportCompany` duplicates `Transporter`, remove the duplicate model.

---

# 31. Status Naming Standards

Use consistent lifecycle names throughout the system.

Prefer:

```text
PENDING
ACTIVE
IN_PROGRESS
COMPLETED
CANCELLED
REJECTED
EXPIRED
SUSPENDED
REASSIGNED
```

Avoid creating multiple names for the same state.

For example, don't use:

```text
DONE
FINISHED
COMPLETE
COMPLETED
```

for the same concept.

Use `COMPLETED`.

---

# 32. Auditability

Important business records should not be hard-deleted.

Especially:

```text
Orders
Payments
Transports
Trip Legs
Driver Assignments
Deliveries
Sales
Inventory Movements
```

Use status/soft deletion where appropriate.

Maintain:

```text
createdAt
updatedAt
createdBy
updatedBy
```

for important business entities where practical.

---

# 33. Tenant Isolation

Every tenant-owned entity must be safely scoped to the tenant.

Never rely on the frontend to filter tenant data.

Every backend query must enforce tenant ownership.

Example:

```text
WHERE
  id = requestedId
  AND tenantId = currentTenantId
```

Do not allow a user from Tenant A to access Tenant B records by guessing IDs.

---

# 34. Database Indexing

Review indexes for:

```text
tenantId
organizationId
stationId
orderId
transportId
driverId
truckId
transporterId
status
createdAt
```

Add composite indexes where common queries require them.

Examples:

```text
tenantId + status
tenantId + createdAt
tenantId + stationId
tenantId + orderId
transportId + sequence
tripLegId + status
```

Do not add indexes blindly. Base them on real query patterns.

---

# 35. Referential Integrity

Review every relation for correct delete behavior.

Financial/history records should generally use:

```text
RESTRICT
```

or soft deletion.

Configuration/child records can use:

```text
CASCADE
```

only when deleting the parent should legitimately delete the children.

Never allow deleting a truck, driver, station, order, or customer to accidentally destroy historical business records.

---

# 36. API Authorization

Every Fleet endpoint must verify:

```text
Authenticated
+
Correct Tenant
+
FLEET module enabled
+
Required permission
```

Every Station endpoint must verify:

```text
Authenticated
+
Correct Tenant
+
STATION module enabled
+
Required permission
```

Do not depend only on frontend route protection.

---

# 37. Frontend Navigation

Navigation should be generated from module/permission access.

Example:

```text
Tenant Modules:
FLEET + STATION

User Permissions:
Fleet: full
Station: read

Sidebar:

Fleet
├── Orders
├── Transporters
├── Trucks
├── Drivers
└── Transports

Stations
├── Stations
├── Sales
└── Reports
```

For a station-only tenant:

```text
Stations
├── Stations
├── Sales
├── Inventory
└── Reports
```

Fleet should not appear.

---

# 38. Recommended Sidebar Structure

## Fleet

```text
Fleet
├── Dashboard
├── Orders
├── Transporters
├── Trucks
├── Drivers
├── Transports
├── Deliveries
└── Reports
```

## Stations

```text
Station Management
├── Dashboard
├── Stations
├── Inventory
├── Tanks
├── Pumps
├── Nozzles
├── Sales
├── Expenses
└── Reports
```

## Finance

```text
Finance
├── Payments
├── Expenses
├── Revenue
└── Profit & Loss
```

Finance can eventually be shared between Fleet and Station while respecting permissions.

---

# 39. Recommended Module Naming

Use these names consistently:

```text
Fleet Management
Station Management
Order Management
Inventory Management
Point of Sale
Finance
Reports & Analytics
```

For Fleet:

```text
Transporters
Trucks
Drivers
Transports
Deliveries
```

Do not use overly technical names in the UI.

---

# 40. Migration Strategy

Do not attempt a destructive rewrite.

Implement changes in phases.

## Phase 1 — Schema Audit

* Review every model.
* Identify duplicate entities.
* Identify unused models.
* Identify incorrect relations.
* Identify missing indexes.
* Identify tenant isolation problems.
* Identify inconsistent naming.
* Document existing dependencies.

Do not change code yet.

---

## Phase 2 — Tenant & Module Architecture

Implement:

```text
Tenant
Organization
TenantUser
AppModule
TenantModule
Permissions
```

Ensure module-level access is enforced by backend.

---

## Phase 3 — Organization & Station Ownership

Implement:

```text
Internal Organization
External Organization
Station Ownership
```

Ensure a fleet manager can manage external client stations.

Ensure station-only tenants can independently manage their stations.

---

## Phase 4 — Fleet Resource Architecture

Clean up:

```text
Transporter
Truck
Driver
```

Implement ownership and status rules.

Remove duplicate `TransportCompany` concepts if unnecessary.

---

## Phase 5 — Order & Invitation Architecture

Refactor:

```text
Order
 ↓
TransportInvitation
 ↓
Transporter
 ↓
Transport
```

Invitation should not require a truck/driver unless the business process specifically requires pre-selection.

---

## Phase 6 — Transport & Trip Architecture

Implement:

```text
Transport
 ↓
TripLeg[]
 ↓
DriverAssignment[]
```

Remove reliance on route JSON for subsequent destinations.

Support:

* One driver for entire trip.
* Different drivers per leg.
* Driver replacement.
* Multiple destinations.
* Return journey.
* Assignment history.

---

## Phase 7 — Delivery & Reconciliation

Implement:

```text
Order
 ↓
Transport
 ↓
Delivery
 ↓
Product Reconciliation
```

Track ordered, dispatched, delivered, and received quantities.

---

## Phase 8 — Station Inventory

Implement auditable inventory movements:

```text
Opening
Delivery
Sale
Adjustment
Transfer
Return
Loss
```

---

## Phase 9 — Sales & Finance

Separate:

```text
Retail Sales
Wholesale/Product Supply
Payments
Expenses
Revenue
Profit
```

Ensure financial records are auditable.

---

## Phase 10 — Reporting

Create reports for:

```text
Fleet
Transport
Driver
Truck
Station
Product
Sales
Payments
Inventory
Profit
```

All reports must be tenant-scoped.

---

# 41. Testing Requirements

Before considering the architecture complete, test these scenarios.

## Scenario 1 — Fleet Manager

```text
Tenant
FLEET + STATION

Owns:
- Trucks
- Drivers
- Stations

Can:
- Create orders
- Assign transport
- Deliver PMS/AGO
- Manage stations
- Track sales
```

## Scenario 2 — Fleet-only Company

```text
Tenant
FLEET

Can:
- Manage trucks
- Manage drivers
- Receive orders
- Deliver products

Cannot:
- Access Station Management
```

## Scenario 3 — Station-only Company

```text
Tenant
STATION

Can:
- Manage stations
- Manage tanks
- Manage pumps
- Sell products
- Manage stock

Cannot:
- Access Fleet
- Create fleet assignments
```

## Scenario 4 — External Client Station

```text
Fleet Manager
    ↓
External Organization
    ↓
Client Station
```

Fleet manager can supply product and manage the station according to permissions.

## Scenario 5 — Different Drivers

```text
Leg 1 → Driver A
Leg 2 → Driver B
Leg 3 → Driver C
```

## Scenario 6 — One Driver

```text
Leg 1 → Driver A
Leg 2 → Driver A
Leg 3 → Driver A
```

## Scenario 7 — Driver Replacement

```text
Driver A → REASSIGNED
Driver B → ACTIVE
```

Historical assignment must remain available.

## Scenario 8 — Tenant Isolation

User from Tenant A must never access:

```text
Tenant B
├── Orders
├── Stations
├── Drivers
├── Trucks
├── Sales
└── Payments
```

---

# 42. Final Target Architecture

The final domain architecture should look like:

```text
                           PLATFORM
                              │
                         ┌────┴────┐
                         │ TENANT  │
                         └────┬────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
          ORGANIZATIONS                 USERS
                 │
        ┌────────┴────────┐
        │                 │
    INTERNAL           EXTERNAL
        │                 │
     Stations          Client Stations
        │
        └──────────────────────────────┐
                                       │
                              ┌────────┴────────┐
                              │                 │
                           STATION            FLEET
                           MODULE             MODULE
                              │                 │
                    ┌─────────┼───────┐    ┌────┴─────────────┐
                    │         │       │    │                  │
                  Tanks     Pumps   Sales  Orders          Transporters
                                                    │       │
                                                    │       ├── Trucks
                                                    │       └── Drivers
                                                    │
                                             Invitations
                                                    │
                                                Transport
                                                    │
                                                Trip Legs
                                                    │
                                          Driver Assignments
                                                    │
                                               Deliveries
                                                    │
                                           Reconciliation
```

---

# 43. Core Architectural Principles

The implementation must follow these principles:

1. **Tenant isolation is mandatory.**
2. **Module access is controlled at tenant level.**
3. **User permissions cannot grant access to a disabled tenant module.**
4. **Fleet and Station are independent modules.**
5. **A Fleet Manager can have both Fleet and Station modules.**
6. **A Station Owner can operate without Fleet.**
7. **External client stations can be managed by Fleet Managers.**
8. **Transporter represents the transportation provider/operator.**
9. **Truck and Driver are fleet resources.**
10. **Invitation represents an offer/request to a transporter.**
11. **Transport represents actual execution.**
12. **TripLeg represents one movement within a transport.**
13. **DriverAssignment represents driver responsibility for a trip leg.**
14. **Never overwrite historical assignments.**
15. **Do not use JSON to represent relational trip legs.**
16. **Keep product supply separate from station retail sales.**
17. **Financial and inventory records must be auditable.**
18. **Avoid duplicate business concepts/models.**
19. **Prefer explicit relational data over ambiguous JSON fields.**
20. **Do not perform destructive migrations without reviewing dependencies and existing data.**

---

# 44. Definition of Done

The architecture is considered ready when:

* [ ] Fleet-only tenants work.
* [ ] Station-only tenants work.
* [ ] Fleet + Station tenants work.
* [ ] External client stations work.
* [ ] Company-owned fleet works.
* [ ] External transporters work.
* [ ] One driver can handle an entire trip.
* [ ] Multiple drivers can handle different trip legs.
* [ ] Driver replacement preserves history.
* [ ] Multiple subsequent destinations work.
* [ ] Return journeys work.
* [ ] PMS/AGO product supply is supported.
* [ ] Delivery quantities are reconciled.
* [ ] Station inventory is auditable.
* [ ] Retail sales are separated from product supply.
* [ ] Payments and expenses are auditable.
* [ ] Profit reports are accurate.
* [ ] Tenant isolation is enforced server-side.
* [ ] Module access is enforced server-side.
* [ ] User permissions are enforced server-side.
* [ ] Historical business records cannot be accidentally deleted.
* [ ] Database relationships and indexes have been reviewed.
* [ ] Duplicate/unused models have been removed or justified.
* [ ] Integration and regression tests pass.

---

# Final Implementation Rule

Before implementing any schema change:

1. Inspect the existing Prisma models and relationships.
2. Identify all affected API routes/services.
3. Identify frontend pages/components using the affected models.
4. Identify seed data and migrations that depend on the model.
5. Make the smallest safe migration.
6. Update backend services and validation.
7. Update frontend forms and workflows.
8. Update permissions.
9. Update seed/test data.
10. Run Prisma validation/generation.
11. Run tests.
12. Verify tenant isolation.
13. Verify both Fleet-only and Station-only workflows.

**Do not rewrite working parts of the system unnecessarily.**

The goal is a clean, scalable, multi-tenant Fleet + Station platform that can grow into a SaaS product without requiring another major database redesign.
