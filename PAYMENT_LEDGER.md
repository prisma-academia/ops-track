Payments Module
Incoming Payments Button
Payment Entry Form (Logging Inflows)
When a client makes a payment, your team will log it using these fields:
Client Name (Dropdown): Pulls from your existing client database.
Sales ID / Order Reference (Dropdown): Automatically populates pending invoices/deliveries linked to that specific client.
Amount Paid (Number field): The exact amount deposited.
Payment Type (Dropdown): * Advance Deposit
Part Payment
Full Settlement
Debt Clearance
Payment Method (Dropdown): Bank Transfer, Cash, Cheque.
Date (Date picker): When the money hit the account.
Transaction Reference (optional Text field): Bank teller number or transfer ID.
Attach Proof (File upload optional): Upload deposit slips or transfer receipts.
Outgoing Payments Button
Expenses logging form 
Personal Expenses: Miscellaneous or administrative costs.(Basic form for recording Personal expenses)
Fleet-Related Expenses: Tolls, union dues, truck repairs, etc.(pulls transporter , select trucks , select orders(optional) this forms should be dynamic so that it  can take multiples entry
Transport fee payments; form that pulls transporters , transport and make necessary payment 
Calculation Logic (Transporter Fees):
The system automatically calculates fees based on order and transport module data. The final payable amount is derived after accounting for:
Losses
Deductions
Subsequent delivery fees
The system supports payments per driver or per transporter, and the final amount remains editable.

LEDGER  MODULE

SALES LEDGER SUBMODULE TABLE 

This is the most critical view for tracking client balances. The system will automatically subtract the Amount Paid from the Amount Expected (from the Sales Module) to show you who is in debt.This section will link directly to the Sales Module (where you record the Liters Sold and Expected Amount) to track exactly who owes you and who has settled their bills.

We should be able to filter ledger with different options such as by any table column , by orders ,by driver , by month ,year , timeline , have a total ledger total amount and calculation on ,allow exports in different file formats 
Table
A simple, running ledger of all money coming into the business on a daily basis.
Client Name
Date payment
Payment Type
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









TRANSPORTATION LEDGER SUBMODULE TABLE
We should be able to filter ledger with different options such as by transporter, by orders ,by driver , by month ,year , timeline , have a total ledger total amount and calculation on ,allow exports in different file formats 


Date
Transporter Name
Driver Name
Order ID
Transport Base Fee
Total Deductions
Maintenance incurred 
Deposit
Net Paid


EXPENSES LEDGER SUBMODULE TABLE
We should be able to filter ledger with different options such as by any column in the table , by month ,year , timeline , have a total ledger total amount and calculation on ,allow exports in different file formats 


Date
Expense Category
Description
Amount
Payment Method
Associated Entity

